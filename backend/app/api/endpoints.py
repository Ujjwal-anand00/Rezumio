from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from fastapi import APIRouter, Body, File, Header, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse


from app.core.config import settings
from app.core.supabase import check_supabase_health, verify_token_and_get_user
from app.models.auth import AuthTokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.models.cover_letter import (
    CoverLetterItem,
    CoverLetterRequest,
    CoverLetterResponse,
    CoverLetterSaveRequest,
)
from app.models.customizer import CustomizeResumeRequest, CustomizeResumeResponse
from app.models.match import MatchScoreResponse
from app.models.parser import ParsedResumeResponse
from app.models.requests import ExportRequest, TailorResumeRequest
from app.models.resume import TailoredResumeResponse
from app.models.version import (
    OriginalResumeCreate,
    OriginalResumeItem,
    ResumeVersionCreate,
    ResumeVersionItem,
    ResumeVersionSummary,
    ResumeVersionUpdate,
)
from app.services.auth_service import auth_service
from app.services.exporter import exporter_service
from app.services.llm.gemini import get_llm_provider
from app.services.match_engine import match_engine_service
from app.services.parser import resume_parser_service
from app.services.version_service import version_service
from app.services.cover_letter_service import CoverLetterService


router = APIRouter()


@router.get("/health", tags=["System"])
async def health_check():
    """Reports safe application and dependency health information without exposing credentials."""
    supabase_info = await check_supabase_health()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "llm_model": settings.GEMINI_MODEL,
        "api_key_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here"),
        "database": {
            "configured": supabase_info.get("configured", False),
            "status": supabase_info.get("status", "local"),
            "provider": "supabase" if supabase_info.get("configured") else "sqlite",
        },
    }


# ==============================================================================
# RESUME PARSER ENDPOINTS
# ==============================================================================

@router.post(
    "/resumes/parse",
    response_model=ParsedResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse resume document",
    description="Upload a PDF or DOCX resume to extract text, structure, and useful metadata using PyMuPDF and python-docx.",
    tags=["Resume Parser"],
)
async def parse_resume_document(file: UploadFile = File(..., description="Resume document file (.pdf or .docx)")):
    """Parses and validates uploaded resume document into structured text and metadata."""
    return resume_parser_service.parse_upload(file)


@router.post("/parse-resume", response_model=ParsedResumeResponse, tags=["Resume Parser"])
async def parse_resume_file_legacy(file: UploadFile = File(...)):
    """Legacy endpoint alias for /api/resumes/parse."""
    return resume_parser_service.parse_upload(file)


@router.post("/resumes", response_model=OriginalResumeItem, status_code=status.HTTP_201_CREATED, tags=["Original Resumes"])
async def create_original_resume_endpoint(
    payload: OriginalResumeCreate,
    authorization: Optional[str] = Header(None),
):
    """Registers an original resume for the authenticated user."""
    user = await verify_token_and_get_user(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to register original resume.",
        )
    return version_service.create_original_resume(payload, user_id=user["id"])


@router.get("/resumes/{resume_id}", response_model=OriginalResumeItem, tags=["Original Resumes"])
async def get_original_resume_endpoint(
    resume_id: str,
    authorization: Optional[str] = Header(None),
):
    """Retrieves an authorized original resume."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.get_original_resume(resume_id, user_id=user_id)


# ==============================================================================
# RESUME CUSTOMIZER / TAILOR ENDPOINTS
# ==============================================================================

@router.post(
    "/resumes/customize",
    response_model=CustomizeResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Customize resume truthfully using Gemini LLM",
    description=(
        "Accepts extracted resume text and a job description. Tailors summary, prioritizes existing skills, "
        "rephrases experience bullets with active impact, highlights matching keywords, and frames missing skills "
        "as interview suggestions without fabricating qualifications."
    ),
    tags=["Resume Customizer"],
)
async def customize_resume(payload: CustomizeResumeRequest):
    """Real Gemini LLM integration for truthful resume customization."""
    provider = get_llm_provider()
    return await provider.customize_resume(payload)


@router.post(
    "/tailor-resume",
    response_model=TailoredResumeResponse,
    tags=["Resume Customizer"],
    summary="Legacy tailor resume endpoint",
)
async def tailor_resume(payload: TailorResumeRequest):
    """Legacy endpoint for tailoring resumes."""
    resume_text = payload.resume_text
    if not resume_text and payload.parsed_resume:
        resume_text = payload.parsed_resume.raw_text

    if not resume_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is required.",
        )

    provider = get_llm_provider()
    tailored = await provider.tailor_resume(
        resume_text=resume_text,
        job_description=payload.job_description,
        target_role=payload.target_role,
        focus_notes=payload.focus_notes,
        required_tech_stack=payload.required_tech_stack,
        protected_contact=payload.protected_contact,
    )
    return tailored


class ExtractTechStackRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="Target job description")


class ExtractTechStackResponse(BaseModel):
    tech_stack: List[str] = Field(default_factory=list, description="Canonical identified technologies")


@router.post(
    "/resumes/extract-tech-stack",
    response_model=ExtractTechStackResponse,
    tags=["Match Score & ATS"],
    summary="Extract technology stack from job description",
)
async def extract_job_tech_stack(payload: ExtractTechStackRequest):
    """Extracts verified technology stack requirements from the job description."""
    tech_stack = match_engine_service.extract_tech_stack(payload.job_description)
    return ExtractTechStackResponse(tech_stack=tech_stack)



# ==============================================================================
# DOCUMENT EXPORT ENDPOINTS
# ==============================================================================

@router.post("/export/{export_format}", tags=["Export"])
@router.post("/resumes/export/{export_format}", tags=["Export"], include_in_schema=False)
async def export_resume(export_format: str, payload: Union[CustomizeResumeResponse, TailoredResumeResponse, Dict[str, Any]] = Body(...)):
    """Generates and downloads the tailored resume in PDF, DOCX, or TXT format based on user's latest edits."""
    import re
    format_clean = export_format.lower().strip()
    
    # Extract candidate name safely
    if isinstance(payload, dict):
        candidate_name = payload.get("contact_info", {}).get("name") or "Tailored_Resume"
    else:
        candidate_name = getattr(getattr(payload, "contact_info", None), "name", None) or "Tailored_Resume"
        
    safe_name = re.sub(r"[^\w\-_\.]", "_", candidate_name.strip() or "Tailored_Resume")

    if format_clean == "docx":
        buffer = exporter_service.generate_docx(payload)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}_Tailored.docx"',
            },
        )
    elif format_clean == "pdf":
        buffer = exporter_service.generate_pdf(payload)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}_Tailored.pdf"',
            },
        )
    elif format_clean in ("txt", "text"):
        content = exporter_service.generate_txt(payload)
        return Response(
            content=content,
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}_Tailored.txt"',
            },
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{export_format}'. Supported formats: pdf, docx, txt.",
        )


# ==============================================================================
# MATCH SCORE & ATS FRIENDLINESS AUDIT
# ==============================================================================

@router.post("/resumes/match-score", response_model=MatchScoreResponse, tags=["Match Score & ATS"])
async def calculate_match_score(payload: TailorResumeRequest):
    """Calculates transparent match score percentage, keyword overlap, and ATS friendliness checklist."""
    resume_text = payload.resume_text
    if not resume_text and payload.parsed_resume:
        resume_text = payload.parsed_resume.raw_text

    if not resume_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume text is required.")

    skills_dict = payload.parsed_resume.skills if payload.parsed_resume else None
    return match_engine_service.calculate_match(
        resume_text=resume_text,
        job_description=payload.job_description,
        parsed_skills=skills_dict,
    )


# ==============================================================================
# STREAMING TAILORING ENDPOINT (SSE)
# ==============================================================================

@router.post("/resumes/tailor-stream", tags=["Streaming"])
async def tailor_resume_stream(payload: TailorResumeRequest):
    """Server-Sent Events (SSE) streaming progress and tailored resume generation."""
    resume_text = payload.resume_text
    if not resume_text and payload.parsed_resume:
        resume_text = payload.parsed_resume.raw_text

    if not resume_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume text is required.")

    async def event_generator():
        import json
        import asyncio
        try:
            yield f"event: progress\ndata: {json.dumps({'step': 'parsing', 'message': 'Parsing resume structure & validating text...', 'percent': 15})}\n\n"
            await asyncio.sleep(0.3)

            yield f"event: progress\ndata: {json.dumps({'step': 'analyzing', 'message': 'Analyzing job description requirements & keywords...', 'percent': 40})}\n\n"
            await asyncio.sleep(0.3)

            yield f"event: progress\ndata: {json.dumps({'step': 'tailoring', 'message': 'Aligning experience bullets with strict zero-hallucination guardrail...', 'percent': 70})}\n\n"

            provider = get_llm_provider()
            tailored = await provider.tailor_resume(
                resume_text=resume_text,
                job_description=payload.job_description,
                target_role=payload.target_role,
                focus_notes=payload.focus_notes,
                required_tech_stack=payload.required_tech_stack,
                protected_contact=payload.protected_contact,
            )


            yield f"event: progress\ndata: {json.dumps({'step': 'auditing', 'message': 'Finalizing ATS verification and score audit...', 'percent': 95})}\n\n"
            await asyncio.sleep(0.2)

            data_json = tailored.model_dump_json()
            yield f"event: complete\ndata: {data_json}\n\n"

        except Exception as e:
            err_payload = json.dumps({"error": str(e) or "Tailoring failed"})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ==============================================================================
# COVER LETTER GENERATION & EXPORT
# ==============================================================================

@router.post("/cover-letter/generate", response_model=CoverLetterResponse, tags=["Cover Letter"])
async def generate_cover_letter_endpoint(payload: CoverLetterRequest):
    """Generates an editable, truthful cover letter tailored to the target role and company."""
    provider = get_llm_provider()
    return await provider.generate_cover_letter(payload)


@router.post("/cover-letter/export/{export_format}", tags=["Cover Letter"])
async def export_cover_letter(export_format: str, payload: CoverLetterResponse):
    """Exports generated cover letter to PDF, DOCX, or plain text."""
    import re
    format_clean = export_format.lower().strip()
    safe_name = re.sub(r"[^\w\-_\.]", "_", payload.candidate_name.strip() or "Cover_Letter")

    if format_clean == "docx":
        buffer = exporter_service.generate_cover_letter_docx(payload)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_Cover_Letter.docx"'},
        )
    elif format_clean == "pdf":
        buffer = exporter_service.generate_cover_letter_pdf(payload)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_Cover_Letter.pdf"'},
        )
    elif format_clean in ("txt", "text"):
        content = exporter_service.generate_cover_letter_txt(payload)
        return Response(
            content=content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_Cover_Letter.txt"'},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{export_format}'. Supported: pdf, docx, txt.",
        )


@router.get("/cover-letters", response_model=List[CoverLetterItem], tags=["Cover Letter"])
async def list_cover_letters_endpoint(authorization: Optional[str] = Header(None)):
    """List saved cover letters for the authenticated user or local session."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return CoverLetterService.list_cover_letters(user_id=user_id)


@router.post("/cover-letters", response_model=CoverLetterItem, tags=["Cover Letter"])
async def save_cover_letter_endpoint(payload: CoverLetterSaveRequest, authorization: Optional[str] = Header(None)):
    """Saves a cover letter (create or update)."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return CoverLetterService.save_cover_letter(payload, user_id=user_id)


@router.get("/cover-letters/{letter_id}", response_model=CoverLetterItem, tags=["Cover Letter"])
async def get_cover_letter_endpoint(letter_id: str, authorization: Optional[str] = Header(None)):
    """Retrieves a specific saved cover letter."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return CoverLetterService.get_cover_letter(letter_id, user_id=user_id)


@router.delete("/cover-letters/{letter_id}", tags=["Cover Letter"])
async def delete_cover_letter_endpoint(letter_id: str, authorization: Optional[str] = Header(None)):
    """Deletes a saved cover letter."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    CoverLetterService.delete_cover_letter(letter_id, user_id=user_id)
    return {"message": "Cover letter deleted successfully."}



# ==============================================================================
# MULTIPLE RESUME VERSIONS
# ==============================================================================

@router.get("/resume-versions", response_model=list[ResumeVersionSummary], tags=["Resume Versions"])
@router.get("/versions", response_model=list[ResumeVersionSummary], tags=["Resume Versions"], include_in_schema=False)
async def list_versions_endpoint(authorization: Optional[str] = Header(None)):
    """List saved resume versions, filtered by authenticated user when logged in."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.list_versions(user_id=user_id)


@router.post("/resume-versions", response_model=ResumeVersionItem, tags=["Resume Versions"])
@router.post("/versions", response_model=ResumeVersionItem, tags=["Resume Versions"], include_in_schema=False)
async def create_version_endpoint(payload: ResumeVersionCreate, authorization: Optional[str] = Header(None)):
    """Saves a new labeled resume version."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.create_version(payload, user_id=user_id)


@router.get("/resume-versions/{version_id}", response_model=ResumeVersionItem, tags=["Resume Versions"])
@router.get("/versions/{version_id}", response_model=ResumeVersionItem, tags=["Resume Versions"], include_in_schema=False)
async def get_version_endpoint(version_id: str, authorization: Optional[str] = Header(None)):
    """Retrieves a specific resume version."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.get_version(version_id, user_id=user_id)


@router.patch("/resume-versions/{version_id}", response_model=ResumeVersionItem, tags=["Resume Versions"])
@router.patch("/versions/{version_id}", response_model=ResumeVersionItem, tags=["Resume Versions"], include_in_schema=False)
async def update_version_endpoint(
    version_id: str,
    payload: ResumeVersionUpdate,
    authorization: Optional[str] = Header(None),
):
    """Updates an existing resume version."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.update_version(version_id, payload, user_id=user_id)


@router.post("/resume-versions/{version_id}/duplicate", response_model=ResumeVersionItem, tags=["Resume Versions"])
@router.post("/versions/{version_id}/duplicate", response_model=ResumeVersionItem, tags=["Resume Versions"], include_in_schema=False)
async def duplicate_version_endpoint(version_id: str, authorization: Optional[str] = Header(None)):
    """Duplicates an existing resume version as a new independent version."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    return version_service.duplicate_version(version_id, user_id=user_id)


@router.delete("/resume-versions/{version_id}", tags=["Resume Versions"])
@router.delete("/versions/{version_id}", tags=["Resume Versions"], include_in_schema=False)
async def delete_version_endpoint(version_id: str, authorization: Optional[str] = Header(None)):
    """Deletes a resume version with user authorization check."""
    user = await verify_token_and_get_user(authorization)
    user_id = user["id"] if user else None
    version_service.delete_version(version_id, user_id=user_id)
    return {"message": "Version deleted successfully."}


# ==============================================================================
# AUTHENTICATION
# ==============================================================================

@router.post("/auth/register", response_model=AuthTokenResponse, tags=["Authentication"])
async def register(payload: UserRegisterRequest):
    """Registers a new user and issues a secure session token."""
    return auth_service.register_user(payload)


@router.post("/auth/login", response_model=AuthTokenResponse, tags=["Authentication"])
async def login(payload: UserLoginRequest):
    """Authenticates a user and returns a session token."""
    return auth_service.login_user(payload)


@router.get("/auth/me", response_model=UserResponse, tags=["Authentication"])
async def get_current_user_endpoint(authorization: Optional[str] = Header(None)):
    """Returns the current authenticated user (supports both Supabase Auth and local sessions)."""
    user = await verify_token_and_get_user(authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("display_name"),
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/auth/logout", tags=["Authentication"])
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidates the active session token."""
    auth_service.logout_token(authorization)
    return {"message": "Logged out successfully."}

