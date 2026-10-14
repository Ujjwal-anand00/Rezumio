from typing import List, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Resume Customizer API"
    API_V1_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Gemini Configuration (Backend only, never exposed to clients)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_TIMEOUT_SECONDS: int = 45
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_MAX_OUTPUT_TOKENS: int = 4096
    GEMINI_TEMPERATURE: float = 0.2
    
    # Supabase & PostgreSQL Configuration (Backend only)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""

    # Upload limits
    MAX_FILE_SIZE_MB: int = 5
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx"]
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
