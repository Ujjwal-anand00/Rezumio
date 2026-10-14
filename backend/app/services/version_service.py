import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.core.database import get_db_connection
from app.core.supabase import get_supabase_client
from app.models.version import (
    OriginalResumeCreate,
    OriginalResumeItem,
    ResumeVersionCreate,
    ResumeVersionItem,
    ResumeVersionSummary,
    ResumeVersionUpdate,
)

logger = logging.getLogger("version_service")


class VersionService:
    """
    Manages resume versions and original resumes with dual persistence:
    Supabase PostgreSQL when configured, with robust SQLite fallback for offline/test environments.
    Strictly verifies ownership and authorization on every record operation.
    """

    # -------------------------------------------------------------------------
    # RESUME VERSIONS
    # -------------------------------------------------------------------------

    @classmethod
    def list_versions(cls, user_id: Optional[str] = None) -> List[ResumeVersionSummary]:
        client = get_supabase_client()
        if client:
            try:
                query = client.table("resume_versions").select(
                    "id, user_id, version_name, job_title, company_name, job_description, original_resume_id, parent_version_id, target_tech_stack, match_score, created_at, updated_at"
                ).order("created_at", desc=True)

                if user_id:
                    query = query.eq("user_id", user_id)
                else:
                    query = query.is_("user_id", "null").limit(50)

                resp = query.execute()
                rows = resp.data or []
                return [
                    ResumeVersionSummary(
                        id=r["id"],
                        user_id=r.get("user_id"),
                        version_name=r.get("version_name") or "Tailored Resume",
                        label=r.get("version_name") or "Tailored Resume",
                        job_title=r.get("job_title"),
                        target_role=r.get("job_title"),
                        company_name=r.get("company_name"),
                        job_description=r.get("job_description"),
                        job_description_snippet=(r.get("job_description") or "")[:300] if r.get("job_description") else None,
                        original_resume_id=r.get("original_resume_id"),
                        parent_version_id=r.get("parent_version_id"),
                        target_tech_stack=r.get("target_tech_stack") or [],
                        match_score=float(r["match_score"]) if r.get("match_score") is not None else None,
                        ats_score=int(round(r["match_score"])) if r.get("match_score") is not None else None,
                        created_at=r["created_at"],
                        updated_at=r["updated_at"],
                    )
                    for r in rows
                ]
            except Exception as e:
                logger.warning(f"Supabase list_versions query failed, falling back to SQLite: {e}")

        # Local SQLite fallback
        conn = get_db_connection()
        if user_id:
            rows = conn.execute(
                """
                SELECT id, user_id, COALESCE(version_name, label) as version_name, label,
                       COALESCE(job_title, target_role) as job_title, target_role,
                       company_name, COALESCE(job_description, job_description_snippet) as job_description,
                       job_description_snippet, original_resume_id, parent_version_id,
                       target_tech_stack, match_score, ats_score, created_at, updated_at
                FROM resume_versions WHERE user_id = ? ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, user_id, COALESCE(version_name, label) as version_name, label,
                       COALESCE(job_title, target_role) as job_title, target_role,
                       company_name, COALESCE(job_description, job_description_snippet) as job_description,
                       job_description_snippet, original_resume_id, parent_version_id,
                       target_tech_stack, match_score, ats_score, created_at, updated_at
                FROM resume_versions WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50
                """,
            ).fetchall()
        conn.close()

        results = []
        for r in rows:
            tech_stack = []
            try:
                if r["target_tech_stack"]:
                    tech_stack = json.loads(r["target_tech_stack"])
            except Exception:
                pass

            m_score = r["match_score"]
            if m_score is None and r["ats_score"] is not None:
                m_score = float(r["ats_score"])
            ats_sc = r["ats_score"]
            if ats_sc is None and m_score is not None:
                ats_sc = int(round(m_score))

            v_name = r["version_name"] or r["label"] or "Tailored Resume"
            results.append(
                ResumeVersionSummary(
                    id=r["id"],
                    user_id=r["user_id"],
                    version_name=v_name,
                    label=v_name,
                    job_title=r["job_title"] or r["target_role"],
                    target_role=r["target_role"] or r["job_title"],
                    company_name=r["company_name"],
                    job_description=r["job_description"] or r["job_description_snippet"],
                    job_description_snippet=r["job_description_snippet"] or (r["job_description"][:300] if r["job_description"] else None),
                    original_resume_id=r["original_resume_id"],
                    parent_version_id=r["parent_version_id"],
                    target_tech_stack=tech_stack,
                    match_score=m_score,
                    ats_score=ats_sc,
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                )
            )
        return results

    @classmethod
    def create_version(cls, req: ResumeVersionCreate, user_id: Optional[str] = None) -> ResumeVersionItem:
        version_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        version_name = req.version_name or req.label or "Tailored Resume"
        job_title = req.job_title or req.target_role or ""
        company_name = req.company_name or ""
        job_desc = req.job_description or req.job_description_snippet or ""
        tech_stack = req.target_tech_stack or []
        m_score = req.match_score if req.match_score is not None else (float(req.ats_score) if req.ats_score is not None else None)
        ats_sc = int(round(m_score)) if m_score is not None else req.ats_score

        # Extract summary if present in resume_data
        prof_summary = req.professional_summary
        if not prof_summary and isinstance(req.resume_data, dict):
            prof_summary = req.resume_data.get("tailored_summary") or req.resume_data.get("summary") or ""

        client = get_supabase_client()
        if client:
            try:
                insert_payload = {
                    "id": version_id,
                    "user_id": user_id,
                    "version_name": version_name,
                    "job_title": job_title,
                    "company_name": company_name or None,
                    "job_description": job_desc,
                    "target_tech_stack": tech_stack,
                    "resume_data": req.resume_data,
                    "professional_summary": prof_summary or "",
                    "match_score": m_score,
                    "original_resume_id": req.original_resume_id or None,
                    "parent_version_id": req.parent_version_id or None,
                    "created_at": now,
                    "updated_at": now,
                }
                client.table("resume_versions").insert(insert_payload).execute()
                return ResumeVersionItem(
                    id=version_id,
                    user_id=user_id,
                    version_name=version_name,
                    label=version_name,
                    job_title=job_title,
                    target_role=job_title,
                    company_name=company_name,
                    job_description=job_desc,
                    job_description_snippet=job_desc[:300] if job_desc else None,
                    original_resume_id=req.original_resume_id,
                    parent_version_id=req.parent_version_id,
                    target_tech_stack=tech_stack,
                    professional_summary=prof_summary,
                    match_score=m_score,
                    ats_score=ats_sc,
                    created_at=now,
                    updated_at=now,
                    resume_data=req.resume_data,
                )
            except Exception as e:
                logger.warning(f"Supabase create_version insert failed, falling back to SQLite: {e}")

        # Local SQLite fallback
        resume_data_str = json.dumps(req.resume_data)
        tech_stack_str = json.dumps(tech_stack)
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO resume_versions (
                id, user_id, label, version_name, target_role, job_title, company_name,
                job_description, job_description_snippet, original_resume_id, parent_version_id,
                target_tech_stack, professional_summary, match_score, ats_score, resume_data, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                version_id,
                user_id,
                version_name,
                version_name,
                job_title,
                job_title,
                company_name,
                job_desc,
                job_desc[:300] if job_desc else "",
                req.original_resume_id,
                req.parent_version_id,
                tech_stack_str,
                prof_summary or "",
                m_score,
                ats_sc,
                resume_data_str,
                now,
                now,
            ),
        )
        conn.commit()
        conn.close()

        return ResumeVersionItem(
            id=version_id,
            user_id=user_id,
            version_name=version_name,
            label=version_name,
            job_title=job_title,
            target_role=job_title,
            company_name=company_name,
            job_description=job_desc,
            job_description_snippet=job_desc[:300] if job_desc else None,
            original_resume_id=req.original_resume_id,
            parent_version_id=req.parent_version_id,
            target_tech_stack=tech_stack,
            professional_summary=prof_summary,
            match_score=m_score,
            ats_score=ats_sc,
            created_at=now,
            updated_at=now,
            resume_data=req.resume_data,
        )

    @classmethod
    def get_version(cls, version_id: str, user_id: Optional[str] = None) -> ResumeVersionItem:
        client = get_supabase_client()
        if client:
            try:
                resp = client.table("resume_versions").select("*").eq("id", version_id).limit(1).execute()
                rows = resp.data or []
                if rows:
                    r = rows[0]
                    owner_id = r.get("user_id")
                    if owner_id:
                        if not user_id:
                            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to access this version.")
                        if owner_id != user_id:
                            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this resume version.")

                    v_name = r.get("version_name") or "Tailored Resume"
                    m_score = float(r["match_score"]) if r.get("match_score") is not None else None
                    ats_sc = int(round(m_score)) if m_score is not None else None
                    job_desc = r.get("job_description") or ""

                    return ResumeVersionItem(
                        id=r["id"],
                        user_id=owner_id,
                        version_name=v_name,
                        label=v_name,
                        job_title=r.get("job_title"),
                        target_role=r.get("job_title"),
                        company_name=r.get("company_name"),
                        job_description=job_desc,
                        job_description_snippet=job_desc[:300] if job_desc else None,
                        original_resume_id=r.get("original_resume_id"),
                        parent_version_id=r.get("parent_version_id"),
                        target_tech_stack=r.get("target_tech_stack") or [],
                        professional_summary=r.get("professional_summary"),
                        match_score=m_score,
                        ats_score=ats_sc,
                        created_at=r["created_at"],
                        updated_at=r["updated_at"],
                        resume_data=r.get("resume_data") or {},
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Supabase get_version failed, checking SQLite: {e}")

        # Local SQLite fallback
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM resume_versions WHERE id = ?", (version_id,)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume version not found.")

        owner_id = row["user_id"]
        if owner_id:
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to access this version.")
            if owner_id != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this resume version.")

        tech_stack = []
        try:
            raw_ts = row["target_tech_stack"]
            if raw_ts:
                tech_stack = json.loads(raw_ts)
        except Exception:
            pass

        m_score = row["match_score"]
        if m_score is None and row["ats_score"] is not None:
            m_score = float(row["ats_score"])
        ats_sc = row["ats_score"]
        if ats_sc is None and m_score is not None:
            ats_sc = int(round(m_score))

        v_name = row["version_name"] or row["label"] or "Tailored Resume"
        job_desc = row["job_description"] or row["job_description_snippet"] or ""

        return ResumeVersionItem(
            id=row["id"],
            user_id=row["user_id"],
            version_name=v_name,
            label=v_name,
            job_title=row["job_title"] or row["target_role"],
            target_role=row["target_role"] or row["job_title"],
            company_name=row["company_name"],
            job_description=job_desc,
            job_description_snippet=row["job_description_snippet"] or (job_desc[:300] if job_desc else None),
            original_resume_id=row["original_resume_id"],
            parent_version_id=row["parent_version_id"],
            target_tech_stack=tech_stack,
            professional_summary=row["professional_summary"],
            match_score=m_score,
            ats_score=ats_sc,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            resume_data=json.loads(row["resume_data"]),
        )

    @classmethod
    def update_version(cls, version_id: str, req: ResumeVersionUpdate, user_id: Optional[str] = None) -> ResumeVersionItem:
        # 1. Fetch and verify ownership first
        existing = cls.get_version(version_id, user_id=user_id)

        now = datetime.now(timezone.utc).isoformat()
        updated_name = req.version_name or req.label or existing.version_name
        updated_title = req.job_title or req.target_role if (req.job_title or req.target_role) is not None else existing.job_title
        updated_company = req.company_name if req.company_name is not None else existing.company_name
        updated_desc = req.job_description if req.job_description is not None else existing.job_description
        updated_tech = req.target_tech_stack if req.target_tech_stack is not None else existing.target_tech_stack
        updated_summary = req.professional_summary if req.professional_summary is not None else existing.professional_summary
        updated_match = req.match_score if req.match_score is not None else existing.match_score
        updated_resume_data = req.resume_data if req.resume_data is not None else existing.resume_data

        client = get_supabase_client()
        if client:
            try:
                update_payload = {
                    "version_name": updated_name,
                    "job_title": updated_title or "",
                    "company_name": updated_company,
                    "job_description": updated_desc or "",
                    "target_tech_stack": updated_tech,
                    "professional_summary": updated_summary or "",
                    "match_score": updated_match,
                    "resume_data": updated_resume_data,
                    "updated_at": now,
                }
                client.table("resume_versions").update(update_payload).eq("id", version_id).execute()
                return cls.get_version(version_id, user_id=user_id)
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Supabase update_version failed, falling back to SQLite: {e}")

        # Local SQLite update
        conn = get_db_connection()
        conn.execute(
            """
            UPDATE resume_versions
            SET label = ?, version_name = ?, target_role = ?, job_title = ?, company_name = ?,
                job_description = ?, target_tech_stack = ?, professional_summary = ?,
                match_score = ?, ats_score = ?, resume_data = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                updated_name,
                updated_name,
                updated_title,
                updated_title,
                updated_company,
                updated_desc,
                json.dumps(updated_tech),
                updated_summary,
                updated_match,
                int(round(updated_match)) if updated_match is not None else None,
                json.dumps(updated_resume_data),
                now,
                version_id,
            ),
        )
        conn.commit()
        conn.close()

        return cls.get_version(version_id, user_id=user_id)

    @classmethod
    def duplicate_version(cls, version_id: str, user_id: Optional[str] = None) -> ResumeVersionItem:
        existing = cls.get_version(version_id, user_id=user_id)
        duplicate_req = ResumeVersionCreate(
            version_name=f"{existing.version_name} (Copy)",
            job_title=existing.job_title,
            company_name=existing.company_name,
            job_description=existing.job_description,
            original_resume_id=existing.original_resume_id,
            parent_version_id=existing.id,
            target_tech_stack=existing.target_tech_stack,
            professional_summary=existing.professional_summary,
            match_score=existing.match_score,
            resume_data=existing.resume_data,
        )
        return cls.create_version(duplicate_req, user_id=user_id)

    @classmethod
    def delete_version(cls, version_id: str, user_id: Optional[str] = None) -> bool:
        # Validate existence and ownership
        cls.get_version(version_id, user_id=user_id)

        client = get_supabase_client()
        if client:
            try:
                client.table("resume_versions").delete().eq("id", version_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete_version failed, falling back to SQLite: {e}")

        conn = get_db_connection()
        conn.execute("DELETE FROM resume_versions WHERE id = ?", (version_id,))
        conn.commit()
        conn.close()
        return True

    # -------------------------------------------------------------------------
    # ORIGINAL RESUMES
    # -------------------------------------------------------------------------

    @classmethod
    def create_original_resume(cls, req: OriginalResumeCreate, user_id: str) -> OriginalResumeItem:
        resume_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        client = get_supabase_client()
        if client:
            try:
                payload = {
                    "id": resume_id,
                    "user_id": user_id,
                    "original_filename": req.original_filename,
                    "file_type": req.file_type.upper(),
                    "protected_data": req.protected_data,
                    "original_resume_data": req.original_resume_data,
                    "created_at": now,
                    "updated_at": now,
                }
                client.table("original_resumes").insert(payload).execute()
                return OriginalResumeItem(
                    id=resume_id,
                    user_id=user_id,
                    original_filename=req.original_filename,
                    file_type=req.file_type.upper(),
                    protected_data=req.protected_data,
                    original_resume_data=req.original_resume_data,
                    created_at=now,
                    updated_at=now,
                )
            except Exception as e:
                logger.warning(f"Supabase create_original_resume failed, falling back to SQLite: {e}")

        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO original_resumes (id, user_id, original_filename, file_type, protected_data, original_resume_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                resume_id,
                user_id,
                req.original_filename,
                req.file_type.upper(),
                json.dumps(req.protected_data),
                json.dumps(req.original_resume_data),
                now,
                now,
            ),
        )
        conn.commit()
        conn.close()

        return OriginalResumeItem(
            id=resume_id,
            user_id=user_id,
            original_filename=req.original_filename,
            file_type=req.file_type.upper(),
            protected_data=req.protected_data,
            original_resume_data=req.original_resume_data,
            created_at=now,
            updated_at=now,
        )

    @classmethod
    def get_original_resume(cls, resume_id: str, user_id: Optional[str] = None) -> OriginalResumeItem:
        client = get_supabase_client()
        if client:
            try:
                resp = client.table("original_resumes").select("*").eq("id", resume_id).limit(1).execute()
                rows = resp.data or []
                if rows:
                    r = rows[0]
                    owner_id = r.get("user_id")
                    if owner_id and owner_id != user_id:
                        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this original resume.")
                    return OriginalResumeItem(
                        id=r["id"],
                        user_id=r["user_id"],
                        original_filename=r["original_filename"],
                        file_type=r["file_type"],
                        protected_data=r.get("protected_data") or {},
                        original_resume_data=r.get("original_resume_data") or {},
                        created_at=r["created_at"],
                        updated_at=r["updated_at"],
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Supabase get_original_resume failed, falling back to SQLite: {e}")

        conn = get_db_connection()
        row = conn.execute("SELECT * FROM original_resumes WHERE id = ?", (resume_id,)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original resume not found.")

        owner_id = row["user_id"]
        if owner_id and owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this original resume.")

        return OriginalResumeItem(
            id=row["id"],
            user_id=row["user_id"],
            original_filename=row["original_filename"],
            file_type=row["file_type"],
            protected_data=json.loads(row["protected_data"]),
            original_resume_data=json.loads(row["original_resume_data"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


version_service = VersionService()
