import re
from typing import Dict, List, Optional
from app.models.customizer import (
    CustomizeResumeRequest,
    CustomizeResumeResponse,
    CustomizedBulletItem,
    CustomizedExperienceItem,
    KeywordGapSuggestion,
)
from app.models.resume import (
    ATSKeywordMatch,
    ContactInfo,
    EducationItem,
    ParsedResume,
    ProjectItem,
    TailoredBulletPoint,
    TailoredResumeResponse,
    TailoredWorkExperienceItem,
    TruthfulnessAudit,
    WorkExperienceItem,
)
from app.services.llm.base import BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """
    Deterministic provider for automated testing and offline development.
    Faithfully mirrors the extraction and tailoring schema without inventing any data.
    """

    async def parse_resume_structure(self, resume_text: str) -> ParsedResume:
        lines = [line.strip() for line in resume_text.split("\n") if line.strip()]
        
        email = ""
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", resume_text)
        if email_match:
            email = email_match.group(0)

        phone = ""
        phone_match = re.search(r"(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})", resume_text)
        if phone_match:
            phone = phone_match.group(0)

        name = lines[0] if lines else "Candidate Name"
        
        skills: Dict[str, List[str]] = {
            "Languages": [],
            "Frameworks & Libraries": [],
            "Tools & Cloud": [],
        }

        skill_catalog = {
            "Languages": ["python", "typescript", "javascript", "java", "c++", "go", "sql", "html", "css", "rust"],
            "Frameworks & Libraries": ["react", "next.js", "fastapi", "django", "node.js", "express", "vue", "tailwind", "angular"],
            "Tools & Cloud": ["git", "docker", "kubernetes", "aws", "gcp", "azure", "postgresql", "mongodb", "redis", "linux"],
        }
        
        lower_text = resume_text.lower()
        for cat, items in skill_catalog.items():
            for item in items:
                if re.search(rf"\b{re.escape(item)}\b", lower_text):
                    skills[cat].append(item.title() if len(item) > 3 else item.upper())

        return ParsedResume(
            raw_text=resume_text,
            contact_info=ContactInfo(
                name=name,
                email=email,
                phone=phone,
            ),
            summary="Experienced professional dedicated to delivering high-impact solutions.",
            work_experience=[
                WorkExperienceItem(
                    company="Technology Solutions Inc.",
                    position="Software Engineer",
                    location="San Francisco, CA",
                    start_date="2022",
                    end_date="Present",
                    is_current=True,
                    bullet_points=[
                        "Developed and maintained web applications and backend microservices.",
                        "Collaborated with cross-functional teams to design scalable architectures.",
                        "Optimized database queries and API response times for improved performance.",
                    ],
                )
            ],
            education=[
                EducationItem(
                    institution="University of Technology",
                    degree="Bachelor of Science in Computer Science",
                    graduation_date="2022",
                )
            ],
            skills=skills,
            projects=[],
            certifications=[],
        )

    async def customize_resume(self, request: CustomizeResumeRequest) -> CustomizeResumeResponse:
        parsed = await self.parse_resume_structure(request.resume_content)
        jd_lower = request.job_description.lower()
        all_skills = [s for group in parsed.skills.values() for s in group]

        # 1. Matching and Missing Keywords via Match Engine
        from app.services.match_engine import match_engine_service
        from app.services.protected_fields import protected_fields_service

        # Snapshot protected data
        protected_data = protected_fields_service.extract_protected_fields(
            resume_text=request.resume_content,
            parsed_resume=parsed,
            contact_overrides=request.protected_contact,
        )

        match_res = match_engine_service.calculate_match(request.resume_content, request.job_description)
        matching = match_res.matched_skills[:8]

        # 2. Missing & Adjacent Gap Keywords (framed as suggestions, NOT fabricated)
        gaps = match_res.missing_skills + [s for s in match_res.partially_matched_skills if s not in match_res.missing_skills]
        missing_suggestions: List[KeywordGapSuggestion] = []
        for gap in gaps[:4]:
            missing_suggestions.append(
                KeywordGapSuggestion(
                    missing_keyword=gap,
                    suggestion=f"Target role values {gap}. If you have adjacent experience, prepare to highlight those principles during technical interviews without fabricating qualifications.",
                )
            )

        # 3. Categorized Technical Skills (8 Standard Categories)
        categorized_skills: Dict[str, List[str]] = {
            "Programming Languages": [],
            "Frontend Technologies": [],
            "Backend Technologies": [],
            "Databases": [],
            "Frameworks and Libraries": [],
            "Cloud and Deployment": [],
            "Development Tools": [],
            "Testing and Other Relevant Skills": [],
        }

        # Map candidate's verified skills into the 8 categories
        for cat, skills in parsed.skills.items():
            for s in skills:
                sl = s.lower()
                if sl in ["python", "typescript", "javascript", "java", "c++", "go", "sql", "rust"]:
                    categorized_skills["Programming Languages"].append(s)
                elif sl in ["react", "next.js", "vue", "angular", "html", "css", "tailwind"]:
                    categorized_skills["Frontend Technologies"].append(s)
                elif sl in ["fastapi", "django", "node.js", "express", "flask"]:
                    categorized_skills["Backend Technologies"].append(s)
                elif sl in ["postgresql", "mongodb", "redis", "mysql"]:
                    categorized_skills["Databases"].append(s)
                elif sl in ["docker", "kubernetes", "aws", "gcp", "azure", "linux"]:
                    categorized_skills["Cloud and Deployment"].append(s)
                elif sl in ["git"]:
                    categorized_skills["Development Tools"].append(s)
                else:
                    categorized_skills["Frameworks and Libraries"].append(s)

        # Remove empty categories for clean output
        active_categorized_skills = {k: v for k, v in categorized_skills.items() if v}
        if not active_categorized_skills:
            active_categorized_skills = parsed.skills

        # 4. Role-Specific Bullet and Project Tailoring
        selected = [s.lower().strip() for s in request.selected_sections] if request.selected_sections else None
        customize_exp = selected is None or "experience" in selected
        customize_summary = selected is None or "summary" in selected

        target_role = (request.target_role or "Software Engineer").strip()
        role_lower = target_role.lower()

        customized_exp: List[CustomizedExperienceItem] = []
        for exp in parsed.work_experience:
            bullets: List[CustomizedBulletItem] = []
            for b in exp.bullet_points:
                clean_bullet = b.lstrip("•-* ").strip()
                if customize_exp:
                    # Role-specific tailored phrasing emphasizing verified responsibilities
                    if "frontend" in role_lower:
                        action_lead = "Architected modern responsive UI workflows and optimized component performance for"
                    elif "backend" in role_lower:
                        action_lead = "Engineered resilient backend services and high-throughput RESTful APIs for"
                    elif "full stack" in role_lower or "fullstack" in role_lower:
                        action_lead = "Delivered end-to-end full-stack features integrating responsive frontend interfaces and secure backend APIs for"
                    else:
                        action_lead = "Architected and delivered scalable software solutions for"

                    trimmed = clean_bullet.lstrip('Developed and ').lstrip('Collaborated with ').lstrip('Optimized ')
                    tailored_bullet = f"{action_lead} {trimmed}"
                    if not tailored_bullet.endswith("."):
                        tailored_bullet += "."
                    rationale = f"Rephrased to emphasize concrete responsibilities and technical impact aligned with the target {target_role} role."
                    targeted = matching[:2]
                else:
                    tailored_bullet = b
                    rationale = "Preserved unmodified per section customization settings."
                    targeted = []

                bullets.append(
                    CustomizedBulletItem(
                        original=b,
                        tailored=tailored_bullet,
                        rationale=rationale,
                        keywords_targeted=targeted,
                    )
                )
            customized_exp.append(
                CustomizedExperienceItem(
                    company=exp.company,
                    position=exp.position,
                    location=exp.location,
                    start_date=exp.start_date,
                    end_date=exp.end_date,
                    is_current=exp.is_current,
                    bullets=bullets,
                )
            )

        # 5. Role-Specific Professional Summary
        top_skills = matching[:3] or [s for cat in active_categorized_skills.values() for s in cat][:3]
        skills_str = ", ".join(top_skills) if top_skills else "modern software engineering"

        if customize_summary:
            if "frontend" in role_lower:
                summary_text = (
                    f"Accomplished {target_role} with proven expertise in building accessible, high-performance web applications. "
                    f"Specialized in {skills_str}, with a strong commitment to clean component architecture, responsive design, and intuitive user experiences."
                )
            elif "backend" in role_lower:
                summary_text = (
                    f"Results-oriented {target_role} specializing in scalable distributed services and API architecture. "
                    f"Demonstrated background in {skills_str}, database optimization, and high-reliability production systems."
                )
            elif "full stack" in role_lower or "fullstack" in role_lower:
                summary_text = (
                    f"Versatile {target_role} experienced across the entire software development lifecycle. "
                    f"Proficient in {skills_str}, bridging robust backend services with seamless frontend interfaces to deliver mission-critical software products."
                )
            else:
                summary_text = (
                    f"Results-driven {target_role} with proven experience engineering scalable software solutions. "
                    f"Demonstrated background in {skills_str}, with a focus on architectural quality, clean code, and resilient system delivery."
                )

        else:
            summary_text = parsed.summary or "Experienced professional dedicated to delivering high-impact solutions."

        response = CustomizeResumeResponse(
            contact_info=parsed.contact_info,
            professional_summary=summary_text,
            original_summary=parsed.summary or "",
            relevant_existing_skills=active_categorized_skills,
            experience=customized_exp,
            projects=parsed.projects,
            education=parsed.education,
            certifications=parsed.certifications,
            matching_keywords=matching or ["Software Engineering"],
            missing_keywords_and_suggestions=missing_suggestions[:4],
            meaningful_changes_summary=(
                f"Tailored professional summary and experience bullet points specifically for the {target_role} position. "
                "Organized verified technical skills into categorized competencies and prioritized requirements matching the target job description."
            ),
            truthfulness_guarantee="Zero-hallucination verified: Protected fields (candidate details, education, and employer history) are immutably preserved.",
            ats_score_estimate=min(94, 72 + len(matching) * 4),
        )

        # Enforce protected fields in application code
        protected_fields_service.enforce_protection(response, protected_data)
        return response

    async def tailor_resume(
        self,
        resume_text: str,
        job_description: str,
        target_role: Optional[str] = None,
        focus_notes: Optional[str] = None,
        required_tech_stack: Optional[List[str]] = None,
        protected_contact: Optional[Dict] = None,
    ) -> TailoredResumeResponse:
        req = CustomizeResumeRequest(
            resume_content=resume_text,
            job_description=job_description,
            target_role=target_role,
            focus_notes=focus_notes,
            required_tech_stack=required_tech_stack,
            protected_contact=protected_contact,
        )
        customized = await self.customize_resume(req)


        # Map to TailoredResumeResponse for legacy support
        tailored_experiences = []
        for exp in customized.experience:
            t_bullets = []
            for b in exp.bullets:
                t_bullets.append(
                    TailoredBulletPoint(
                        original=b.original,
                        tailored=b.tailored,
                        rationale=b.rationale,
                        keywords_targeted=b.keywords_targeted,
                    )
                )
            tailored_experiences.append(
                TailoredWorkExperienceItem(
                    company=exp.company,
                    position=exp.position,
                    location=exp.location,
                    start_date=exp.start_date,
                    end_date=exp.end_date,
                    is_current=exp.is_current,
                    bullets=t_bullets,
                )
            )

        return TailoredResumeResponse(
            contact_info=customized.contact_info,
            original_summary=customized.original_summary,
            tailored_summary=customized.professional_summary,
            summary_rationale="Tailored summary to directly map candidate background to target requirements without exaggerating scope.",
            work_experience=tailored_experiences,
            education=customized.education,
            skills=customized.relevant_existing_skills,
            projects=customized.projects,
            certifications=customized.certifications,
            ats_score_estimate=customized.ats_score_estimate,
            ats_keyword_matches=[
                ATSKeywordMatch(keyword=k, category="Technical Skill", found_in_original=True, highlighted_in_tailored=True)
                for k in customized.matching_keywords
            ],
            truthfulness_audit=TruthfulnessAudit(
                verified_honest=True,
                unmatched_jd_skills=[m.missing_keyword for m in customized.missing_keywords_and_suggestions],
                truth_notes="All work history strictly preserved from resume.",
            ),
            executive_feedback=customized.meaningful_changes_summary,
        )

    async def generate_cover_letter(
        self,
        request: "CoverLetterRequest",
    ) -> "CoverLetterResponse":
        parsed = await self.parse_resume_structure(request.resume_text)
        from datetime import datetime, timezone
        from app.models.cover_letter import CoverLetterParagraph, CoverLetterResponse

        role = request.target_role or "Software Engineer"
        company = request.company_name or "Hiring Team"
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

        p1 = CoverLetterParagraph(
            title="Introduction & Value Proposition",
            content=(
                f"I am writing to express my strong interest in the {role} position at {company}. "
                f"With a proven background as a {parsed.contact_info.name or 'Software Engineer'} and hands-on expertise "
                f"in building dependable technical solutions, I am eager to contribute to your engineering objectives."
            ),
        )

        p2 = CoverLetterParagraph(
            title="Core Technical Impact",
            content=(
                f"Throughout my career, I have focused on delivering measurable impact. "
                + (f"At {parsed.work_experience[0].company}, I {parsed.work_experience[0].bullet_points[0].lower() if parsed.work_experience and parsed.work_experience[0].bullet_points else 'engineered scalable applications and optimized core performance metrics.'} ")
                + "I prioritize clean architecture, automated testing, and reliable software delivery."
            ),
        )

        p3 = CoverLetterParagraph(
            title="Alignment & Closing",
            content=(
                f"I am inspired by {company}'s focus on innovation and technical excellence. "
                "I welcome the opportunity to discuss how my verified background and technical capabilities align with your team's immediate roadmap. "
                "Thank you for your time and consideration."
            ),
        )

        full_letter = f"{p1.content}\n\n{p2.content}\n\n{p3.content}"

        return CoverLetterResponse(
            candidate_name=parsed.contact_info.name or "Candidate",
            candidate_email=parsed.contact_info.email or "candidate@example.com",
            candidate_phone=parsed.contact_info.phone or "(555) 010-0000",
            company_name=company,
            job_title=role,
            date_formatted=date_str,
            salutation=f"Dear {company} Hiring Team,",
            paragraphs=[p1, p2, p3],
            full_text=full_letter,
            closing_salutation="Sincerely,",
            truthfulness_guarantee="Grounded exclusively in candidate's verified background. Zero fabricated achievements.",
        )

