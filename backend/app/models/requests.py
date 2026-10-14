from typing import Optional
from pydantic import BaseModel, Field
from app.models.resume import ParsedResume, TailoredResumeResponse


class TailorResumeRequest(BaseModel):
    resume_text: Optional[str] = None
    job_description: str = Field(..., min_length=20, description="Full pasted job description")
    target_role: Optional[str] = Field(None, description="Optional target title or role")
    focus_notes: Optional[str] = Field(None, description="Candidate specific notes or focus areas")
    parsed_resume: Optional[ParsedResume] = None
    selected_sections: Optional[list[str]] = Field(
        default=None,
        description="Optional list of sections to customize: ['summary', 'skills', 'experience', 'projects', 'education']",
    )
    required_tech_stack: Optional[list[str]] = Field(
        default=None,
        description="Identified or user-selected technical stack requirements from the job description",
    )
    protected_contact: Optional[dict] = Field(
        default=None,
        description="User-verified protected contact details to preserve immutably",
    )


class ExportRequest(BaseModel):
    resume_data: TailoredResumeResponse
    format: str = Field(..., pattern="^(pdf|docx|txt)$")
