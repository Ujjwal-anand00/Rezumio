from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.resume import ContactInfo


class ParsedResumeResponse(BaseModel):
    filename: str = Field(..., description="Original uploaded filename")
    file_type: str = Field(..., description="Document format: 'pdf' or 'docx'")
    file_size_bytes: int = Field(..., description="Upload file size in bytes")
    page_count: Optional[int] = Field(None, description="Number of pages if PDF")
    word_count: int = Field(..., description="Extracted word count")
    character_count: int = Field(..., description="Extracted character count")
    text: str = Field(..., description="Cleaned and normalized resume text")
    contact_info: ContactInfo = Field(default_factory=ContactInfo, description="Detected contact info")
    is_scanned_or_low_text: bool = Field(False, description="Flag if document appears image-based/scanned with low text")
    warnings: List[str] = Field(default_factory=list, description="Any extraction warnings or limitation notes")
