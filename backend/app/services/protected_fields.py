import re
import logging
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from app.models.resume import ContactInfo, EducationItem, ParsedResume, TailoredResumeResponse
from app.models.customizer import CustomizeResumeResponse

logger = logging.getLogger("protected_fields")


class ProtectedResumeData(BaseModel):
    """
    Immutable snapshot of candidate's verified personal information, education,
    employer history, and factual records.
    The LLM must NEVER modify, rewrite, replace, or invent values for these fields.
    """
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    education: List[EducationItem] = Field(default_factory=list)
    experience_headers: List[Dict[str, Any]] = Field(default_factory=list)
    project_headers: List[Dict[str, Any]] = Field(default_factory=list)
    unverified_fields: List[str] = Field(default_factory=list)


class ProtectedFieldsService:
    """
    Service responsible for extracting, snapshotting, and enforcing protected fields
    in application code (not just through LLM prompt instructions).
    """

    @classmethod
    def extract_protected_fields(
        cls,
        resume_text: str,
        parsed_resume: Optional[ParsedResume] = None,
        contact_overrides: Optional[Union[ContactInfo, Dict[str, Any]]] = None,
    ) -> ProtectedResumeData:
        unverified: List[str] = []

        # 1. Contact Info Extraction
        contact = ContactInfo()
        if parsed_resume and parsed_resume.contact_info:
            contact = parsed_resume.contact_info.model_copy()
        else:
            # Fallback regex extraction from raw text
            email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", resume_text)
            phone_match = re.search(
                r"(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})",
                resume_text,
            )
            linkedin_match = re.search(
                r"(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+",
                resume_text,
                re.IGNORECASE,
            )
            github_match = re.search(
                r"(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-]+",
                resume_text,
                re.IGNORECASE,
            )

            first_line = ""
            for line in resume_text.splitlines():
                clean_l = line.strip()
                if (
                    clean_l
                    and len(clean_l) < 50
                    and not any(k in clean_l.lower() for k in ["@", "http", "phone", "resume", "curriculum", "page"])
                ):
                    first_line = clean_l
                    break

            contact = ContactInfo(
                name=first_line,
                email=email_match.group(0) if email_match else "",
                phone=phone_match.group(0) if phone_match else "",
                linkedin=linkedin_match.group(0) if linkedin_match else None,
                github=github_match.group(0) if github_match else None,
            )

        # Apply intentional user overrides if provided
        if contact_overrides:
            if isinstance(contact_overrides, ContactInfo):
                override_dict = contact_overrides.model_dump(exclude_unset=True)
            else:
                override_dict = contact_overrides

            if override_dict.get("name"):
                contact.name = override_dict["name"]
            if override_dict.get("email"):
                contact.email = override_dict["email"]
            if override_dict.get("phone"):
                contact.phone = override_dict["phone"]
            if override_dict.get("location"):
                contact.location = override_dict["location"]
            if override_dict.get("website"):
                contact.website = override_dict["website"]
            if override_dict.get("linkedin"):
                contact.linkedin = override_dict["linkedin"]
            if override_dict.get("github"):
                contact.github = override_dict["github"]

        # Flag missing or ambiguous contact fields
        if not contact.name:
            unverified.append("Full Name not confidently detected")
        if not contact.email:
            unverified.append("Email address not found in resume")
        if not contact.phone:
            unverified.append("Phone number not found in resume")

        # 2. Education Snapshot
        education: List[EducationItem] = []
        if parsed_resume and parsed_resume.education:
            education = [item.model_copy() for item in parsed_resume.education]
        else:
            # Heuristic regex extraction for education
            degree_pattern = re.compile(
                r"(Bachelor(?:\'s)?|Master(?:\'s)?|B\.S\.|M\.S\.|B\.Tech|M\.Tech|Ph\.D\.|Associate(?:\'s)?|Degree)\s+(?:of|in)?\s*([A-Za-z\s]+)?",
                re.IGNORECASE,
            )
            univ_pattern = re.compile(
                r"([A-Za-z\s]+(?:University|College|Institute of Technology|Polytechnic|Academy))",
                re.IGNORECASE,
            )
            year_pattern = re.compile(r"\b(20\d{2}|19\d{2})\b")

            for line in resume_text.splitlines():
                dm = degree_pattern.search(line)
                um = univ_pattern.search(line)
                ym = year_pattern.search(line)
                if dm or um:
                    institution = um.group(1).strip() if um else "University / Institution"
                    degree = dm.group(0).strip() if dm else "Degree"
                    grad_date = ym.group(1) if ym else None
                    education.append(
                        EducationItem(
                            institution=institution,
                            degree=degree,
                            graduation_date=grad_date,
                        )
                    )
                    break

        if not education:
            unverified.append("Education details not detected; please verify in resume preview")

        # 3. Work Experience Headers Snapshot (company, position, dates, location)
        experience_headers: List[Dict[str, Any]] = []
        if parsed_resume and parsed_resume.work_experience:
            for exp in parsed_resume.work_experience:
                experience_headers.append({
                    "company": exp.company,
                    "position": exp.position,
                    "location": exp.location,
                    "start_date": exp.start_date,
                    "end_date": exp.end_date,
                    "is_current": exp.is_current,
                })

        # 4. Project Headers Snapshot
        project_headers: List[Dict[str, Any]] = []
        if parsed_resume and parsed_resume.projects:
            for proj in parsed_resume.projects:
                project_headers.append({
                    "title": proj.title,
                    "link": proj.link,
                })

        return ProtectedResumeData(
            contact_info=contact,
            education=education,
            experience_headers=experience_headers,
            project_headers=project_headers,
            unverified_fields=unverified,
        )

    @classmethod
    def enforce_protection(
        cls,
        target_resume: Union[TailoredResumeResponse, CustomizeResumeResponse],
        protected_data: ProtectedResumeData,
    ) -> None:
        """
        Enforces immutable protection on personal information, education,
        and employer names in application code.
        Overrides any LLM modifications to protected fields with original values.
        """
        # 1. Contact Information Protection
        if protected_data.contact_info.name:
            target_resume.contact_info.name = protected_data.contact_info.name
        if protected_data.contact_info.email:
            target_resume.contact_info.email = protected_data.contact_info.email
        if protected_data.contact_info.phone:
            target_resume.contact_info.phone = protected_data.contact_info.phone
        if protected_data.contact_info.location:
            target_resume.contact_info.location = protected_data.contact_info.location
        if protected_data.contact_info.linkedin:
            target_resume.contact_info.linkedin = protected_data.contact_info.linkedin
        if protected_data.contact_info.github:
            target_resume.contact_info.github = protected_data.contact_info.github
        if protected_data.contact_info.website:
            target_resume.contact_info.website = protected_data.contact_info.website

        # 2. Education Protection (LLM cannot invent or modify degrees/colleges)
        if protected_data.education:
            target_resume.education = [e.model_copy() for e in protected_data.education]

        # 3. Work Experience Header Protection (companies and dates preserved)
        if protected_data.experience_headers:
            exp_list = getattr(target_resume, "work_experience", None) or getattr(target_resume, "experience", None) or []
            for i, exp in enumerate(exp_list):
                if i < len(protected_data.experience_headers):
                    orig = protected_data.experience_headers[i]
                    if orig.get("company"):
                        exp.company = orig["company"]
                    if orig.get("position"):
                        exp.position = orig["position"]
                    if orig.get("start_date"):
                        exp.start_date = orig["start_date"]
                    if orig.get("end_date"):
                        exp.end_date = orig["end_date"]
                    if orig.get("location"):
                        exp.location = orig["location"]
                    if "is_current" in orig:
                        exp.is_current = orig["is_current"]

        # 4. Project Header Protection (project names preserved)
        if protected_data.project_headers and hasattr(target_resume, "projects") and target_resume.projects:
            for i, proj in enumerate(target_resume.projects):
                if i < len(protected_data.project_headers):
                    orig_proj = protected_data.project_headers[i]
                    if orig_proj.get("title"):
                        proj.title = orig_proj["title"]
                    if orig_proj.get("link"):
                        proj.link = orig_proj["link"]


protected_fields_service = ProtectedFieldsService()
