from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    full_name: Optional[str] = Field(None, max_length=100)


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
