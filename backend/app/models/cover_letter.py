from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.resume import ContactInfo


class CoverLetterRequest(BaseModel):
    resume_text: str = Field(..., min_length=20, description="Candidate resume text")
    job_description: str = Field(..., min_length=20, description="Job description text")
    company_name: Optional[str] = Field("Hiring Organization", description="Target company name")
    target_role: Optional[str] = Field(None, description="Target job title")
    tone: Optional[str] = Field("Confident & Professional", description="Tone of the cover letter")
    focus_points: Optional[str] = Field(None, description="Candidate priorities or specific projects to highlight")


class CoverLetterParagraph(BaseModel):
    title: str = Field(..., description="Paragraph purpose, e.g. Introduction, Core Impact, Company Alignment, Conclusion")
    content: str = Field(..., description="Paragraph text strictly grounded in real qualifications")


class CoverLetterResponse(BaseModel):
    candidate_name: str
    candidate_email: str
    candidate_phone: str
    company_name: str
    job_title: str
    date_formatted: str
    salutation: str
    paragraphs: List[CoverLetterParagraph]
    full_text: str
    closing_salutation: str = "Sincerely,"
    truthfulness_guarantee: str = "Grounded exclusively in verified candidate background. No achievements fabricated."


class CoverLetterSaveRequest(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = "Cover Letter"
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    cover_letter_data: CoverLetterResponse


class CoverLetterItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    cover_letter_data: CoverLetterResponse
    created_at: str
    updated_at: str

