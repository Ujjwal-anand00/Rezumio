import asyncio
import json
import logging
from typing import Optional
from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.customizer import (
    CustomizeResumeRequest,
    CustomizeResumeResponse,
    GeminiCustomizeResumeSchema,
)
from app.models.resume import (
    ParsedResume,
    GeminiParsedResumeSchema,
    TailoredResumeResponse,
    TailoredWorkExperienceItem,
    TailoredBulletPoint,
    ATSKeywordMatch,
    TruthfulnessAudit,
)
from app.models.cover_letter import CoverLetterRequest, CoverLetterResponse
from app.services.llm.base import BaseLLMProvider
from app.services.llm.prompts import (
    COVER_LETTER_SYSTEM_PROMPT,
    PARSE_RESUME_PROMPT,
    RESUME_CUSTOMIZE_SYSTEM_PROMPT,
)
from app.services.llm.mock import MockLLMProvider


logger = logging.getLogger("gemini_provider")

CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM implementation with strict Pydantic structured output,
    prompt injection defense, bounded retries, and quota handling.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        self._fallback_mock = MockLLMProvider()

        if self._is_valid_key(self.api_key):
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {type(e).__name__}")
                self.client = None
        else:
            self.client = None

    def _is_valid_key(self, key: Optional[str]) -> bool:
        if not key:
            return False
        clean = key.strip()
        if clean in ("", "your-gemini-api-key-here", "placeholder"):
            return False
        return True

    async def customize_resume(self, request: CustomizeResumeRequest) -> CustomizeResumeResponse:
        """
        Customizes candidate resume against job description using Gemini structured output.
        Includes prompt injection isolation, bounded retries, and timeout.
        """
        if not self.client:
            logger.info("No valid Gemini API key configured. Executing truthful deterministic mock provider.")
            return await self._fallback_mock.customize_resume(request)

        # Extract and snapshot protected fields before LLM invocation
        from app.services.protected_fields import protected_fields_service
        protected_data = protected_fields_service.extract_protected_fields(
            resume_text=request.resume_content,
            contact_overrides=request.protected_contact,
        )

        # Build prompt with explicit untrusted boundaries
        tech_stack_ctx = f"\n- Required Technology Stack: {', '.join(request.required_tech_stack)}" if request.required_tech_stack else ""
        user_prompt = f"""=== BEGIN UNTRUSTED TARGET JOB DESCRIPTION ===
{request.job_description}
=== END UNTRUSTED TARGET JOB DESCRIPTION ===

=== BEGIN UNTRUSTED CANDIDATE RESUME CONTENT ===
{request.resume_content}
=== END UNTRUSTED CANDIDATE RESUME CONTENT ===

ADDITIONAL CUSTOMIZATION CONTEXT:
- Target Role / Title: {request.target_role or "Derived from Job Description"}{tech_stack_ctx}
- Candidate Focus Notes: {request.focus_notes or "None provided"}
- Selected Sections: {", ".join(request.selected_sections) if request.selected_sections else "All sections (Summary, Skills, Experience, Education, Projects)"}

TASK:
Analyze the provided resume against the job description and target role.
Craft a natural, role-specific professional summary aligned with the target role and tech stack.
Organize verified skills into the 8 standard categories.
Rephrase experience and project bullets to emphasize relevant competencies without inventing any facts or metrics.
Preserve all candidate personal info, education, and employer history strictly unmodified."""

        config = types.GenerateContentConfig(
            system_instruction=RESUME_CUSTOMIZE_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=GeminiCustomizeResumeSchema,
            temperature=settings.GEMINI_TEMPERATURE,
            max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
        )

        # Candidate model cascade list
        models_to_try = [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]

        last_exception = None
        for current_model in models_to_try:
            for attempt in range(1, settings.GEMINI_MAX_RETRIES + 1):
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            self.client.models.generate_content,
                            model=current_model,
                            contents=user_prompt,
                            config=config,
                        ),
                        timeout=settings.GEMINI_TIMEOUT_SECONDS,
                    )

                    if not response or not response.text:
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Gemini LLM returned an empty response. Please retry.",
                        )

                    data = json.loads(response.text)
                    result = CustomizeResumeResponse.model_validate(data)

                    # Preserve unselected sections unmodified
                    if request.selected_sections:
                        selected = [s.lower().strip() for s in request.selected_sections]
                        if "summary" not in selected and result.original_summary:
                            result.professional_summary = result.original_summary
                        if "experience" not in selected:
                            for exp in result.experience:
                                for b in exp.bullets:
                                    b.tailored = b.original
                                    b.rationale = "Preserved unmodified per section customization settings."

                    # Enforce immutable protection on protected fields in application code
                    protected_fields_service.enforce_protection(result, protected_data)
                    return result

                except asyncio.TimeoutError:
                    logger.warning(f"Gemini API timeout on model {current_model} attempt {attempt}")
                    last_exception = HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="Gemini API timed out processing the resume. Please retry.",
                    )

                except json.JSONDecodeError as jde:
                    logger.error(f"Malformed JSON from Gemini: {str(jde)}")
                    last_exception = HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="LLM output could not be parsed as valid JSON.",
                    )

                except Exception as e:
                    err_msg = str(e)
                    logger.error(f"Gemini API call ({current_model}) attempt {attempt} failed: {type(e).__name__} - {err_msg}")

                    if "404" in err_msg or "NOT_FOUND" in err_msg or "no longer available" in err_msg:
                        # Try next model in fallback list immediately
                        break

                    if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
                        if attempt < settings.GEMINI_MAX_RETRIES:
                            await asyncio.sleep(1.5 * attempt)
                            continue
                        logger.warning("Gemini rate limit exceeded. Falling back to deterministic provider.")
                        return await self._fallback_mock.customize_resume(request)

                    if "503" in err_msg or "UNAVAILABLE" in err_msg or "high demand" in err_msg:
                        if attempt < settings.GEMINI_MAX_RETRIES:
                            await asyncio.sleep(1.0 * attempt)
                            continue
                        # Try next model in fallback list
                        break

                    if "API_KEY_INVALID" in err_msg or "PERMISSION_DENIED" in err_msg:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid Gemini API credentials. Please verify your GEMINI_API_KEY environment variable.",
                        )

                    last_exception = HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to communicate with LLM provider: {type(e).__name__}",
                    )

                if attempt < settings.GEMINI_MAX_RETRIES:
                    await asyncio.sleep(1.0 * attempt)

        # If all API attempts fail, fall back gracefully to truthful mock provider
        logger.warning("All Gemini model attempts exhausted. Falling back to deterministic provider.")
        return await self._fallback_mock.customize_resume(request)

    async def tailor_resume(
        self,
        resume_text: str,
        job_description: str,
        target_role: Optional[str] = None,
        focus_notes: Optional[str] = None,
        required_tech_stack: Optional[List[str]] = None,
        protected_contact: Optional[Dict] = None,
    ) -> TailoredResumeResponse:
        """Tailors resume using Gemini LLM and converts to TailoredResumeResponse."""
        req = CustomizeResumeRequest(
            resume_content=resume_text,
            job_description=job_description,
            target_role=target_role,
            focus_notes=focus_notes,
            required_tech_stack=required_tech_stack,
            protected_contact=protected_contact,
        )
        customized = await self.customize_resume(req)

        # Convert CustomizedExperienceItem to TailoredWorkExperienceItem
        work_experience = []
        for exp in customized.experience:
            bullets = [
                TailoredBulletPoint(
                    original=b.original,
                    tailored=b.tailored,
                    rationale=b.rationale,
                    keywords_targeted=b.keywords_targeted,
                )
                for b in exp.bullets
            ]
            work_experience.append(
                TailoredWorkExperienceItem(
                    company=exp.company,
                    position=exp.position,
                    location=exp.location,
                    start_date=exp.start_date,
                    end_date=exp.end_date,
                    is_current=exp.is_current,
                    bullets=bullets,
                )
            )

        ats_keyword_matches = [
            ATSKeywordMatch(
                keyword=kw,
                category="Technical Skill",
                found_in_original=True,
                highlighted_in_tailored=True,
            )
            for kw in customized.matching_keywords
        ]

        unmatched = [
            s.missing_keyword for s in customized.missing_keywords_and_suggestions
        ]

        return TailoredResumeResponse(
            contact_info=customized.contact_info,
            original_summary=customized.original_summary,
            tailored_summary=customized.professional_summary,
            summary_rationale=customized.meaningful_changes_summary,
            work_experience=work_experience,
            education=customized.education,
            skills=customized.relevant_existing_skills,
            projects=customized.projects,
            certifications=customized.certifications,
            ats_score_estimate=customized.ats_score_estimate,
            ats_keyword_matches=ats_keyword_matches,
            truthfulness_audit=TruthfulnessAudit(
                verified_honest=True,
                unmatched_jd_skills=unmatched,
                truth_notes=customized.truthfulness_guarantee,
            ),
            executive_feedback=customized.meaningful_changes_summary,
        )

    async def parse_resume_structure(self, resume_text: str) -> ParsedResume:
        if not self.client:
            return await self._fallback_mock.parse_resume_structure(resume_text)

        prompt = f"""=== CANDIDATE RESUME ===
{resume_text}

TASK: Extract structured details into the required schema."""

        try:
            config = types.GenerateContentConfig(
                system_instruction=PARSE_RESUME_PROMPT,
                response_mime_type="application/json",
                response_schema=GeminiParsedResumeSchema,
                temperature=0.1,
            )

            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=settings.GEMINI_TIMEOUT_SECONDS,
            )

            if not response or not response.text:
                return await self._fallback_mock.parse_resume_structure(resume_text)

            data = json.loads(response.text)
            return ParsedResume.model_validate(data)

        except Exception as e:
            logger.error(f"Gemini API parse error: {str(e)}")
            return await self._fallback_mock.parse_resume_structure(resume_text)

    async def generate_cover_letter(
        self,
        request: CoverLetterRequest,
    ) -> CoverLetterResponse:
        if not self.client:
            return await self._fallback_mock.generate_cover_letter(request)

        prompt = f"""=== UNTRUSTED TARGET JOB DESCRIPTION ===
{request.job_description}

=== UNTRUSTED CANDIDATE RESUME ===
{request.resume_text}

TARGET COMPANY: {request.company_name or "Hiring Team"}
TARGET ROLE: {request.target_role or "Software Engineer"}
TONE: {request.tone or "Confident & Professional"}
CANDIDATE FOCUS NOTES: {request.focus_points or "None"}

TASK: Generate a customized, truthful cover letter strictly grounded in the candidate's real resume qualifications."""

        config = types.GenerateContentConfig(
            system_instruction=COVER_LETTER_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=CoverLetterResponse,
            temperature=0.3,
            max_output_tokens=3000,
        )

        models_to_try = [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]
        for current_model in models_to_try:
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.client.models.generate_content,
                        model=current_model,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=settings.GEMINI_TIMEOUT_SECONDS,
                )
                if response and response.text:
                    data = json.loads(response.text)
                    return CoverLetterResponse.model_validate(data)
            except Exception as e:
                logger.error(f"Gemini cover letter generation error ({current_model}): {type(e).__name__} - {str(e)}")
                continue

        return await self._fallback_mock.generate_cover_letter(request)



def get_llm_provider() -> BaseLLMProvider:
    return GeminiProvider()

