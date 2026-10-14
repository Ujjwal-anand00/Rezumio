from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.resume import ContactInfo, EducationItem, ProjectItem, SkillCategory


class CustomizedBulletItem(BaseModel):
    original: str = Field(..., description="Original experience bullet text")
    tailored: str = Field(..., description="Rephrased, action-verb impact bullet text")
    rationale: str = Field(..., description="Explanation of why this change was made and what was aligned")
    keywords_targeted: List[str] = Field(default_factory=list, description="Target keywords emphasized in this bullet")


class CustomizedExperienceItem(BaseModel):
    company: str
    position: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    bullets: List[CustomizedBulletItem] = Field(default_factory=list)


class KeywordGapSuggestion(BaseModel):
    missing_keyword: str = Field(..., description="Keyword or requirement present in JD but absent in resume")
    suggestion: str = Field(
        ...,
        description="Actionable advice for addressing this gap in interviews. NOT fabricated into resume.",
    )


class CustomizeResumeRequest(BaseModel):
    resume_content: str = Field(
        ...,
        min_length=20,
        max_length=50000,
        description="Extracted or pasted resume text",
    )
    job_description: str = Field(
        ...,
        min_length=20,
        max_length=50000,
        description="Validated target job description",
    )
    target_role: Optional[str] = Field(
        None,
        max_length=150,
        description="Optional target role or title",
    )
    focus_notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional candidate directives or focus priorities",
    )
    selected_sections: Optional[List[str]] = Field(
        default=None,
        description="Optional list of sections to customize. If provided, unselected sections are preserved unmodified.",
    )
    required_tech_stack: Optional[List[str]] = Field(
        default=None,
        description="Optional list of target technologies extracted from JD",
    )
    protected_contact: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional user-verified contact fields to preserve immutably",
    )


class CustomizeResumeResponse(BaseModel):
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    professional_summary: str = Field(..., description="Tailored professional summary aligned with target position")
    original_summary: str = Field("", description="Candidate's original summary if present")
    relevant_existing_skills: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Categorized existing skills prioritized by relevance to the JD",
    )
    experience: List[CustomizedExperienceItem] = Field(
        default_factory=list,
        description="Reordered and enhanced work experience entries",
    )
    projects: List[ProjectItem] = Field(
        default_factory=list,
        description="Candidate's real projects emphasizing relevant technologies",
    )
    education: List[EducationItem] = Field(
        default_factory=list,
        description="Candidate's verified education",
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Candidate's verified certifications",
    )
    matching_keywords: List[str] = Field(
        default_factory=list,
        description="Key job description skills confirmed present in candidate's background",
    )
    missing_keywords_and_suggestions: List[KeywordGapSuggestion] = Field(
        default_factory=list,
        description="Missing JD requirements framed as suggestions, NEVER fabricated",
    )
    meaningful_changes_summary: str = Field(
        ...,
        description="Executive explanation of meaningful modifications made across the resume",
    )
    truthfulness_guarantee: str = Field(
        default="Zero-hallucination verified: No employers, metrics, dates, degrees, or skills were fabricated.",
        description="Explicit guarantee that only real candidate qualifications were utilized",
    )
    ats_score_estimate: int = Field(default=85, ge=0, le=100)

    @field_validator("relevant_existing_skills", mode="before")
    @classmethod
    def normalize_skills(cls, v):
        if isinstance(v, list):
            res = {}
            for item in v:
                if isinstance(item, dict):
                    res[item.get("category", "General")] = item.get("skills", [])
                elif hasattr(item, "category") and hasattr(item, "skills"):
                    res[item.category] = item.skills
            return res
        return v


class GeminiCustomizeResumeSchema(BaseModel):
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    professional_summary: str = Field(..., description="Tailored professional summary aligned with target position")
    original_summary: str = Field("", description="Candidate's original summary if present")
    relevant_existing_skills: List[SkillCategory] = Field(
        default_factory=list,
        description="Categorized existing skills prioritized by relevance to the JD",
    )
    experience: List[CustomizedExperienceItem] = Field(
        default_factory=list,
        description="Reordered and enhanced work experience entries",
    )
    projects: List[ProjectItem] = Field(
        default_factory=list,
        description="Candidate's real projects emphasizing relevant technologies",
    )
    education: List[EducationItem] = Field(
        default_factory=list,
        description="Candidate's verified education",
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Candidate's verified certifications",
    )
    matching_keywords: List[str] = Field(
        default_factory=list,
        description="Key job description skills confirmed present in candidate's background",
    )
    missing_keywords_and_suggestions: List[KeywordGapSuggestion] = Field(
        default_factory=list,
        description="Missing JD requirements framed as suggestions, NEVER fabricated",
    )
    meaningful_changes_summary: str = Field(
        ...,
        description="Executive explanation of meaningful modifications made across the resume",
    )
    truthfulness_guarantee: str = Field(
        default="Zero-hallucination verified: No employers, metrics, dates, degrees, or skills were fabricated.",
        description="Explicit guarantee that only real candidate qualifications were utilized",
    )
    ats_score_estimate: int = Field(default=85, ge=0, le=100)

