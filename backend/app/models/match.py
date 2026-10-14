from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field


class RequirementItem(BaseModel):
    requirement: str = Field(..., description="Meaningful skill, experience, or qualification phrase")
    category: str = Field(
        default="technical_skill",
        description="Category: technical_skill, experience, responsibility, education, or soft_skill",
    )
    status: str = Field(
        default="missing",
        description="Status: matched, partially_matched, or missing",
    )
    resume_evidence: Optional[str] = Field(
        default=None,
        alias="resumeEvidence",
        description="Relevant resume text snippet supporting match",
    )
    job_evidence: Optional[str] = Field(
        default=None,
        alias="jobEvidence",
        description="Relevant job description text snippet specifying requirement",
    )
    explanation: str = Field(
        default="",
        description="Concise reasoning for classification",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score in the classification",
    )

    model_config = {
        "populate_by_name": True,
        "serialize_by_alias": True,
    }


class MatchBreakdown(BaseModel):
    skills_score: int = Field(..., ge=0, le=100, description="Percentage of JD skills present in candidate profile")
    experience_score: int = Field(..., ge=0, le=100, description="Alignment of candidate work history to JD requirements")
    keyword_score: int = Field(..., ge=0, le=100, description="Exact and semantic keyword overlap percentage")
    formula_explanation: str = Field(
        default="Overall = (Skills * 40%) + (Experience * 35%) + (Keywords * 25%)",
        description="Transparent scoring formula",
    )


class ATSFriendlinessCheck(BaseModel):
    category: str  # e.g., "Heading Structure", "Selectable Text", "Contact Info", "Format Consistency"
    passed: bool
    details: str
    impact: str  # "High", "Medium", "Low"


class MatchScoreResponse(BaseModel):
    overall_match_score: int = Field(..., ge=0, le=100)
    ats_score: int = Field(..., ge=0, le=100)
    breakdown: MatchBreakdown
    matched_skills: List[str] = Field(default_factory=list)
    partially_matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    requirements: List[RequirementItem] = Field(default_factory=list)
    actionable_suggestions: List[str] = Field(default_factory=list)
    ats_checks: List[ATSFriendlinessCheck] = Field(default_factory=list)
    ats_limitations_disclaimer: str = Field(
        default=(
            "ATS systems are keyword and layout parsing algorithms, not hiring decisions. "
            "A high ATS score helps pass automated screening filters, but human recruiters evaluate clarity, "
            "demonstrated impact, and culture fit."
        )
    )

    model_config = {
        "populate_by_name": True,
    }
