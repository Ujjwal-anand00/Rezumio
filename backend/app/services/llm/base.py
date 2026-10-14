from abc import ABC, abstractmethod
from typing import Optional
from app.models.customizer import CustomizeResumeRequest, CustomizeResumeResponse
from app.models.resume import ParsedResume, TailoredResumeResponse
from app.models.cover_letter import CoverLetterRequest, CoverLetterResponse



class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM providers."""

    @abstractmethod
    async def customize_resume(
        self,
        request: CustomizeResumeRequest,
    ) -> CustomizeResumeResponse:
        """Customize resume strictly according to the job description while adhering to truthfulness."""
        pass

    @abstractmethod
    async def tailor_resume(
        self,
        resume_text: str,
        job_description: str,
        target_role: Optional[str] = None,
        focus_notes: Optional[str] = None,
        required_tech_stack: Optional[list[str]] = None,
        protected_contact: Optional[dict] = None,
    ) -> TailoredResumeResponse:
        """Tailor resume text according to the provided job description."""
        pass


    @abstractmethod
    async def parse_resume_structure(self, resume_text: str) -> ParsedResume:
        """Parse raw resume text into structured fields."""
        pass

    @abstractmethod
    async def generate_cover_letter(
        self,
        request: "CoverLetterRequest",
    ) -> "CoverLetterResponse":
        """Generate a truthful, customized cover letter grounded in real resume qualifications."""
        pass

