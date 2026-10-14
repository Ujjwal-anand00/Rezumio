import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, Header, status
from app.core.database import get_db_connection
from app.models.auth import AuthTokenResponse, UserRegisterRequest, UserLoginRequest, UserResponse


class AuthService:
    """Secure authentication service with PBKDF2 password hashing and secure token sessions."""

    @staticmethod
    def _hash_password(password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
        if salt is None:
            salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return key.hex(), salt.hex()

    @staticmethod
    def _verify_password(password: str, password_hash: str, salt_hex: str) -> bool:
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key.hex(), password_hash)

    @classmethod
    def register_user(cls, req: UserRegisterRequest) -> AuthTokenResponse:
        email_clean = req.email.strip().lower()
        if not email_clean or "@" not in email_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address.")
        if len(req.password) < 6:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")

        p_hash, salt = cls._hash_password(req.password)
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO users (id, email, password_hash, salt, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, email_clean, p_hash, salt, req.full_name or "", now),
            )
            # Create session
            token = secrets.token_urlsafe(32)
            expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (token, user_id, now, expires),
            )
            conn.commit()
        except Exception as e:
            conn.close()
            if "UNIQUE" in str(e).upper():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to register user.")
        finally:
            conn.close()

        user_resp = UserResponse(id=user_id, email=email_clean, full_name=req.full_name, created_at=now)
        return AuthTokenResponse(access_token=token, user=user_resp)

    @classmethod
    def login_user(cls, req: UserLoginRequest) -> AuthTokenResponse:
        email_clean = req.email.strip().lower()
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email_clean,)).fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        if not cls._verify_password(req.password, row["password_hash"], row["salt"]):
            conn.close()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc).isoformat()
        expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, row["id"], now, expires),
        )
        conn.commit()
        conn.close()

        user_resp = UserResponse(id=row["id"], email=row["email"], full_name=row["full_name"], created_at=row["created_at"])
        return AuthTokenResponse(access_token=token, user=user_resp)

    @classmethod
    def get_user_from_token(cls, token: Optional[str]) -> Optional[UserResponse]:
        if not token:
            return None
        # Support 'Bearer <token>' prefix
        if token.startswith("Bearer "):
            token = token[7:].strip()

        conn = get_db_connection()
        row = conn.execute("""
            SELECT u.id, u.email, u.full_name, u.created_at, s.expires_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
        """, (token,)).fetchone()
        conn.close()

        if not row:
            return None
        # Check expiry
        try:
            exp = datetime.fromisoformat(row["expires_at"])
            if exp < datetime.now(timezone.utc):
                return None
        except Exception:
            pass

        return UserResponse(id=row["id"], email=row["email"], full_name=row["full_name"], created_at=row["created_at"])

    @classmethod
    def logout_token(cls, token: Optional[str]):
        if not token:
            return
        if token.startswith("Bearer "):
            token = token[7:].strip()
        conn = get_db_connection()
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()


auth_service = AuthService()
