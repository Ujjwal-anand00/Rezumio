import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.core.database import get_db_connection
from app.core.supabase import get_supabase_client
from app.models.cover_letter import (
    CoverLetterItem,
    CoverLetterResponse,
    CoverLetterSaveRequest,
)

logger = logging.getLogger("cover_letter_service")


class CoverLetterService:
    """
    Manages persistence for cover letters with dual backend:
    Supabase PostgreSQL when configured, with robust SQLite fallback.
    """

    @classmethod
    def list_cover_letters(cls, user_id: Optional[str] = None) -> List[CoverLetterItem]:
        client = get_supabase_client()
        if client:
            try:
                query = client.table("cover_letters").select("*").order("created_at", desc=True)
                if user_id:
                    query = query.eq("user_id", user_id)
                else:
                    query = query.is_("user_id", "null").limit(50)
                resp = query.execute()
                rows = resp.data or []
                results: List[CoverLetterItem] = []
                for r in rows:
                    cl_data = r["cover_letter_data"]
                    if isinstance(cl_data, str):
                        cl_data = json.loads(cl_data)
                    results.append(
                        CoverLetterItem(
                            id=str(r["id"]),
                            user_id=r.get("user_id"),
                            title=r.get("title") or "Cover Letter",
                            company_name=r.get("company_name"),
                            job_title=r.get("job_title"),
                            candidate_name=r.get("candidate_name"),
                            cover_letter_data=CoverLetterResponse.model_validate(cl_data),
                            created_at=str(r["created_at"]),
                            updated_at=str(r["updated_at"]),
                        )
                    )
                return results
            except Exception as e:
                logger.warning(f"Supabase cover_letters list failed, falling back to SQLite: {e}")

        # SQLite fallback
        conn = get_db_connection()
        try:
            if user_id:
                cursor = conn.execute(
                    "SELECT * FROM cover_letters WHERE user_id = ? ORDER BY created_at DESC",
                    (user_id,),
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM cover_letters WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50"
                )
            rows = cursor.fetchall()
            results: List[CoverLetterItem] = []
            for r in rows:
                cl_data = json.loads(r["cover_letter_data"])
                results.append(
                    CoverLetterItem(
                        id=str(r["id"]),
                        user_id=r["user_id"],
                        title=r["title"] or "Cover Letter",
                        company_name=r["company_name"],
                        job_title=r["job_title"],
                        candidate_name=r["candidate_name"],
                        cover_letter_data=CoverLetterResponse.model_validate(cl_data),
                        created_at=str(r["created_at"]),
                        updated_at=str(r["updated_at"]),
                    )
                )
            return results
        finally:
            conn.close()

    @classmethod
    def save_cover_letter(
        cls, payload: CoverLetterSaveRequest, user_id: Optional[str] = None
    ) -> CoverLetterItem:
        now_iso = datetime.now(timezone.utc).isoformat()
        cl_data_dict = payload.cover_letter_data.model_dump()
        target_company = payload.company_name or payload.cover_letter_data.company_name
        target_role = payload.job_title or payload.cover_letter_data.job_title
        candidate_name = payload.cover_letter_data.candidate_name
        title = payload.title or f"{target_role} Cover Letter — {target_company}"

        # If payload has an existing ID, attempt update first
        if payload.id:
            return cls.update_cover_letter(payload.id, payload, user_id=user_id)

        new_id = str(uuid.uuid4())
        client = get_supabase_client()
        if client:
            try:
                insert_payload: Dict[str, Any] = {
                    "id": new_id,
                    "title": title,
                    "company_name": target_company,
                    "job_title": target_role,
                    "candidate_name": candidate_name,
                    "cover_letter_data": cl_data_dict,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                if user_id:
                    insert_payload["user_id"] = user_id

                resp = client.table("cover_letters").insert(insert_payload).execute()
                if resp.data and len(resp.data) > 0:
                    r = resp.data[0]
                    return CoverLetterItem(
                        id=str(r["id"]),
                        user_id=r.get("user_id"),
                        title=r["title"],
                        company_name=r.get("company_name"),
                        job_title=r.get("job_title"),
                        candidate_name=r.get("candidate_name"),
                        cover_letter_data=payload.cover_letter_data,
                        created_at=str(r["created_at"]),
                        updated_at=str(r["updated_at"]),
                    )
            except Exception as e:
                logger.warning(f"Supabase cover_letters insert failed, falling back to SQLite: {e}")

        # SQLite fallback
        conn = get_db_connection()
        try:
            conn.execute(
                """
                INSERT INTO cover_letters (
                    id, user_id, title, candidate_name, job_title, company_name,
                    cover_letter_data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id,
                    user_id,
                    title,
                    candidate_name,
                    target_role,
                    target_company,
                    json.dumps(cl_data_dict),
                    now_iso,
                    now_iso,
                ),
            )
            conn.commit()
            return CoverLetterItem(
                id=new_id,
                user_id=user_id,
                title=title,
                company_name=target_company,
                job_title=target_role,
                candidate_name=candidate_name,
                cover_letter_data=payload.cover_letter_data,
                created_at=now_iso,
                updated_at=now_iso,
            )
        finally:
            conn.close()

    @classmethod
    def update_cover_letter(
        cls, cl_id: str, payload: CoverLetterSaveRequest, user_id: Optional[str] = None
    ) -> CoverLetterItem:
        now_iso = datetime.now(timezone.utc).isoformat()
        cl_data_dict = payload.cover_letter_data.model_dump()
        target_company = payload.company_name or payload.cover_letter_data.company_name
        target_role = payload.job_title or payload.cover_letter_data.job_title
        candidate_name = payload.cover_letter_data.candidate_name
        title = payload.title or f"{target_role} Cover Letter — {target_company}"

        client = get_supabase_client()
        if client:
            try:
                update_payload = {
                    "title": title,
                    "company_name": target_company,
                    "job_title": target_role,
                    "candidate_name": candidate_name,
                    "cover_letter_data": cl_data_dict,
                    "updated_at": now_iso,
                }
                query = client.table("cover_letters").update(update_payload).eq("id", cl_id)
                if user_id:
                    query = query.eq("user_id", user_id)
                resp = query.execute()
                if resp.data and len(resp.data) > 0:
                    r = resp.data[0]
                    return CoverLetterItem(
                        id=str(r["id"]),
                        user_id=r.get("user_id"),
                        title=r["title"],
                        company_name=r.get("company_name"),
                        job_title=r.get("job_title"),
                        candidate_name=r.get("candidate_name"),
                        cover_letter_data=payload.cover_letter_data,
                        created_at=str(r["created_at"]),
                        updated_at=str(r["updated_at"]),
                    )
            except Exception as e:
                logger.warning(f"Supabase cover_letters update failed, falling back to SQLite: {e}")

        conn = get_db_connection()
        try:
            if user_id:
                row = conn.execute(
                    "SELECT user_id, created_at FROM cover_letters WHERE id = ?", (cl_id,)
                ).fetchone()
                if not row:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found.")
                if row["user_id"] and row["user_id"] != user_id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
                created_at = row["created_at"]
                conn.execute(
                    """
                    UPDATE cover_letters
                    SET title = ?, company_name = ?, job_title = ?, candidate_name = ?,
                        cover_letter_data = ?, updated_at = ?
                    WHERE id = ? AND (user_id = ? OR user_id IS NULL)
                    """,
                    (title, target_company, target_role, candidate_name, json.dumps(cl_data_dict), now_iso, cl_id, user_id),
                )
            else:
                row = conn.execute("SELECT created_at FROM cover_letters WHERE id = ?", (cl_id,)).fetchone()
                created_at = row["created_at"] if row else now_iso
                conn.execute(
                    """
                    UPDATE cover_letters
                    SET title = ?, company_name = ?, job_title = ?, candidate_name = ?,
                        cover_letter_data = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (title, target_company, target_role, candidate_name, json.dumps(cl_data_dict), now_iso, cl_id),
                )
            conn.commit()
            return CoverLetterItem(
                id=cl_id,
                user_id=user_id,
                title=title,
                company_name=target_company,
                job_title=target_role,
                candidate_name=candidate_name,
                cover_letter_data=payload.cover_letter_data,
                created_at=str(created_at),
                updated_at=now_iso,
            )
        finally:
            conn.close()

    @classmethod
    def get_cover_letter(cls, cl_id: str, user_id: Optional[str] = None) -> CoverLetterItem:
        client = get_supabase_client()
        if client:
            try:
                query = client.table("cover_letters").select("*").eq("id", cl_id).limit(1)
                resp = query.execute()
                if resp.data and len(resp.data) > 0:
                    r = resp.data[0]
                    if user_id and r.get("user_id") and r["user_id"] != user_id:
                        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
                    cl_data = r["cover_letter_data"]
                    if isinstance(cl_data, str):
                        cl_data = json.loads(cl_data)
                    return CoverLetterItem(
                        id=str(r["id"]),
                        user_id=r.get("user_id"),
                        title=r["title"],
                        company_name=r.get("company_name"),
                        job_title=r.get("job_title"),
                        candidate_name=r.get("candidate_name"),
                        cover_letter_data=CoverLetterResponse.model_validate(cl_data),
                        created_at=str(r["created_at"]),
                        updated_at=str(r["updated_at"]),
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Supabase cover_letter get failed, falling back to SQLite: {e}")

        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM cover_letters WHERE id = ?", (cl_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found.")
            if user_id and row["user_id"] and row["user_id"] != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
            cl_data = json.loads(row["cover_letter_data"])
            return CoverLetterItem(
                id=str(row["id"]),
                user_id=row["user_id"],
                title=row["title"],
                company_name=row["company_name"],
                job_title=row["job_title"],
                candidate_name=row["candidate_name"],
                cover_letter_data=CoverLetterResponse.model_validate(cl_data),
                created_at=str(row["created_at"]),
                updated_at=str(row["updated_at"]),
            )
        finally:
            conn.close()

    @classmethod
    def delete_cover_letter(cls, cl_id: str, user_id: Optional[str] = None) -> None:
        client = get_supabase_client()
        if client:
            try:
                query = client.table("cover_letters").delete().eq("id", cl_id)
                if user_id:
                    query = query.eq("user_id", user_id)
                query.execute()
                return
            except Exception as e:
                logger.warning(f"Supabase cover_letter delete failed: {e}")

        conn = get_db_connection()
        try:
            if user_id:
                row = conn.execute("SELECT user_id FROM cover_letters WHERE id = ?", (cl_id,)).fetchone()
                if row and row["user_id"] and row["user_id"] != user_id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
            conn.execute("DELETE FROM cover_letters WHERE id = ?", (cl_id,))
            conn.commit()
        finally:
            conn.close()
