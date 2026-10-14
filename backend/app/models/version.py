from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class ResumeVersionCreate(BaseModel):
    version_name: Optional[str] = Field(None, max_length=150, description="Name or title for this resume version")
    label: Optional[str] = Field(None, max_length=150, description="Legacy alias for version_name")
    job_title: Optional[str] = Field(None, max_length=150, description="Target job title")
    target_role: Optional[str] = Field(None, max_length=150, description="Legacy alias for job_title")
    company_name: Optional[str] = Field(None, max_length=150, description="Target company name")
    job_description: Optional[str] = Field(None, description="Job description text")
    job_description_snippet: Optional[str] = Field(None, max_length=1000, description="Snippet or summary of job description")
    original_resume_id: Optional[str] = Field(None, description="UUID of original resume")
    parent_version_id: Optional[str] = Field(None, description="UUID of parent version if cloned")
    target_tech_stack: List[str] = Field(default_factory=list, description="Target technology stack identified")
    professional_summary: Optional[str] = Field(None, description="Tailored professional summary")
    match_score: Optional[float] = Field(None, ge=0, le=100, description="Computed match/ATS score")
    ats_score: Optional[int] = Field(None, ge=0, le=100, description="Legacy alias for match_score")
    resume_data: Dict[str, Any] = Field(..., description="Full structured resume data")

    @model_validator(mode="after")
    def populate_defaults(self):
        # Synchronize aliases
        if not self.version_name and self.label:
            self.version_name = self.label
        elif not self.version_name and not self.label:
            self.version_name = "Tailored Resume"
            self.label = "Tailored Resume"
        else:
            self.label = self.version_name

        if not self.job_title and self.target_role:
            self.job_title = self.target_role
        elif not self.target_role and self.job_title:
            self.target_role = self.job_title

        if not self.job_description and self.job_description_snippet:
            self.job_description = self.job_description_snippet
        elif not self.job_description_snippet and self.job_description:
            self.job_description_snippet = self.job_description[:300]

        if self.match_score is None and self.ats_score is not None:
            self.match_score = float(self.ats_score)
        elif self.ats_score is None and self.match_score is not None:
            self.ats_score = int(round(self.match_score))

        return self


class ResumeVersionUpdate(BaseModel):
    version_name: Optional[str] = Field(None, max_length=150)
    label: Optional[str] = Field(None, max_length=150)
    job_title: Optional[str] = Field(None, max_length=150)
    target_role: Optional[str] = Field(None, max_length=150)
    company_name: Optional[str] = Field(None, max_length=150)
    job_description: Optional[str] = None
    target_tech_stack: Optional[List[str]] = None
    professional_summary: Optional[str] = None
    match_score: Optional[float] = Field(None, ge=0, le=100)
    ats_score: Optional[int] = Field(None, ge=0, le=100)
    resume_data: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def sync_update_fields(self):
        if not self.version_name and self.label:
            self.version_name = self.label
        elif not self.label and self.version_name:
            self.label = self.version_name

        if not self.job_title and self.target_role:
            self.job_title = self.target_role
        elif not self.target_role and self.job_title:
            self.target_role = self.job_title

        if self.match_score is None and self.ats_score is not None:
            self.match_score = float(self.ats_score)
        elif self.ats_score is None and self.match_score is not None:
            self.ats_score = int(round(self.match_score))

        return self


class ResumeVersionItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    version_name: str
    label: str
    job_title: Optional[str] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    job_description_snippet: Optional[str] = None
    original_resume_id: Optional[str] = None
    parent_version_id: Optional[str] = None
    target_tech_stack: List[str] = Field(default_factory=list)
    professional_summary: Optional[str] = None
    match_score: Optional[float] = None
    ats_score: Optional[int] = None
    created_at: str
    updated_at: str
    resume_data: Dict[str, Any]


class ResumeVersionSummary(BaseModel):
    id: str
    user_id: Optional[str] = None
    version_name: str
    label: str
    job_title: Optional[str] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    job_description_snippet: Optional[str] = None
    original_resume_id: Optional[str] = None
    parent_version_id: Optional[str] = None
    target_tech_stack: List[str] = Field(default_factory=list)
    match_score: Optional[float] = None
    ats_score: Optional[int] = None
    created_at: str
    updated_at: str


class OriginalResumeCreate(BaseModel):
    original_filename: str = Field(..., max_length=255)
    file_type: str = Field(..., max_length=10)
    protected_data: Dict[str, Any] = Field(default_factory=dict)
    original_resume_data: Dict[str, Any] = Field(default_factory=dict)


class OriginalResumeItem(BaseModel):
    id: str
    user_id: str
    original_filename: str
    file_type: str
    protected_data: Dict[str, Any]
    original_resume_data: Dict[str, Any]
    created_at: str
    updated_at: str
