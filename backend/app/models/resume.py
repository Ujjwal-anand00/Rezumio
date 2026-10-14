from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class ContactInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None


class SkillCategory(BaseModel):
    category: str = Field(..., description="Skill category name, e.g. Languages, Frameworks, Developer Tools")
    skills: List[str] = Field(default_factory=list, description="List of verified skills belonging to this category")


class WorkExperienceItem(BaseModel):
    company: str
    position: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    bullet_points: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    graduation_date: Optional[str] = None
    location: Optional[str] = None
    gpa: Optional[str] = None


class ProjectItem(BaseModel):
    title: str
    role: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None
    bullet_points: List[str] = Field(default_factory=list)


class ParsedResume(BaseModel):
    raw_text: str
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    skills: Dict[str, List[str]] = Field(default_factory=dict)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)

    @field_validator("skills", mode="before")
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


class GeminiParsedResumeSchema(BaseModel):
    raw_text: str = ""
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    skills: List[SkillCategory] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)


class TailoredBulletPoint(BaseModel):
    original: str
    tailored: str
    rationale: str
    keywords_targeted: List[str] = Field(default_factory=list)


class TailoredWorkExperienceItem(BaseModel):
    company: str
    position: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    bullets: List[TailoredBulletPoint] = Field(default_factory=list)


class ATSKeywordMatch(BaseModel):
    keyword: str
    category: str = "Technical Skill"  # Technical Skill, Tool, Methodology, Soft Skill
    found_in_original: bool = True
    highlighted_in_tailored: bool = True


class TruthfulnessAudit(BaseModel):
    verified_honest: bool = True
    unmatched_jd_skills: List[str] = Field(default_factory=list)
    truth_notes: str = (
        "No employers, dates, metrics, degrees, or skills were fabricated. "
        "Any JD requirements missing from the original resume were excluded to maintain absolute truthfulness."
    )


class TailoredResumeResponse(BaseModel):
    contact_info: ContactInfo
    original_summary: str = ""
    tailored_summary: str = ""
    summary_rationale: str = ""
    work_experience: List[TailoredWorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    skills: Dict[str, List[str]] = Field(default_factory=dict)
    certifications: List[str] = Field(default_factory=list)
    ats_score_estimate: int = Field(default=85, ge=0, le=100)
    ats_keyword_matches: List[ATSKeywordMatch] = Field(default_factory=list)
    truthfulness_audit: TruthfulnessAudit = Field(default_factory=TruthfulnessAudit)
    executive_feedback: str = ""

    @field_validator("skills", mode="before")
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


