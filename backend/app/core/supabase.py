import logging
from typing import Any, Dict, Optional
import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("supabase")

_supabase_client = None


def get_supabase_client():
    """Lazily initializes and returns the Supabase client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = (settings.SUPABASE_URL or "").strip()
    key = (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY or "").strip()

    if not url or not key:
        return None

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {str(e)}")
        return None


async def check_supabase_health() -> Dict[str, Any]:
    """
    Safely checks Supabase connectivity without leaking credentials.
    Returns safe status information.
    """
    url = (settings.SUPABASE_URL or "").strip()
    key = (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY or "").strip()

    if not url or not key:
        return {
            "configured": False,
            "status": "not_configured",
            "message": "Supabase environment variables not set. Using local database mode.",
        }

    client = get_supabase_client()
    if not client:
        return {
            "configured": True,
            "status": "unhealthy",
            "message": "Supabase client initialization failed.",
        }

    try:
        # Lightweight ping to Supabase Auth API
        async with httpx.AsyncClient(timeout=4.0) as http_client:
            resp = await http_client.get(
                f"{url.rstrip('/')}/auth/v1/health",
                headers={"apikey": key},
            )
            if resp.status_code in (200, 204):
                return {
                    "configured": True,
                    "status": "connected",
                    "auth_healthy": True,
                }

        # Secondary check: ping REST
        async with httpx.AsyncClient(timeout=4.0) as http_client:
            rest_resp = await http_client.get(
                f"{url.rstrip('/')}/rest/v1/",
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
            )
            if rest_resp.status_code in (200, 401, 403, 404):
                return {
                    "configured": True,
                    "status": "connected",
                    "rest_healthy": True,
                }

        return {
            "configured": True,
            "status": "unhealthy",
            "message": "Supabase health ping returned unexpected response.",
        }
    except Exception as e:
        logger.warning(f"Supabase health check connection error: {type(e).__name__}")
        return {
            "configured": True,
            "status": "unreachable",
            "message": f"Connection error: {type(e).__name__}",
        }


async def verify_token_and_get_user(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Validates user session/JWT token either via Supabase Auth or local auth fallback.
    Returns user dict: {"id": str, "email": str, "display_name": Optional[str]} or None.
    NEVER trusts client-supplied user_id.
    """
    if not token:
        return None

    clean_token = token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token[7:].strip()

    if not clean_token:
        return None

    # 1. Try Supabase Auth verification if Supabase is configured
    url = (settings.SUPABASE_URL or "").strip()
    key = (settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY or "").strip()

    if url and key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                resp = await http_client.get(
                    f"{url.rstrip('/')}/auth/v1/user",
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {clean_token}",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user_id = data.get("id")
                    email = data.get("email", "")
                    meta = data.get("user_metadata", {}) or {}
                    display_name = meta.get("full_name") or meta.get("display_name") or meta.get("name") or email.split("@")[0]
                    return {
                        "id": str(user_id),
                        "email": email,
                        "display_name": display_name,
                        "source": "supabase",
                    }
        except Exception as e:
            logger.debug(f"Supabase auth verification failed, checking local auth fallback: {e}")

    # 2. Local auth fallback for development / offline tests
    from app.services.auth_service import auth_service
    local_user = auth_service.get_user_from_token(clean_token)
    if local_user:
        return {
            "id": str(local_user.id),
            "email": local_user.email,
            "display_name": local_user.full_name or local_user.email.split("@")[0],
            "source": "local",
        }

    return None
