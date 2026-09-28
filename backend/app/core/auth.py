import logging
import re
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.errors import AuthError, AuthRetryableError
from supabase_auth.types import User

from app.core.config import settings
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)
_JWT_SHAPE = re.compile(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _auth_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Auth service unavailable",
    )


# Sync on purpose: get_user() is a blocking HTTP call, so FastAPI runs this in
# its threadpool instead of stalling the event loop.
def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Validate the Supabase access token and return the verified user.

    Validation is delegated to Supabase Auth (GET /auth/v1/user), which checks
    the signature, the `exp` claim, and that the session hasn't been signed
    out. Decoding the JWT locally would miss revoked sessions.
    """
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Not authenticated")

    if not _JWT_SHAPE.fullmatch(credentials.credentials):
        raise _unauthorized("Invalid or expired token")

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth is not configured",
        )

    try:
        response = get_supabase_client().auth.get_user(credentials.credentials)
    except AuthRetryableError as exc:
        logger.warning("Supabase Auth unreachable: %s", exc)
        raise _auth_unavailable() from exc
    except httpx.HTTPError as exc:
        logger.warning("Supabase Auth request failed: %s", type(exc).__name__)
        raise _auth_unavailable() from exc
    except AuthError as exc:
        if getattr(exc, "status", 0) >= 500:
            logger.warning("Supabase Auth error %s", exc.status)
            raise _auth_unavailable() from exc
        raise _unauthorized("Invalid or expired token") from exc

    if response is None or response.user is None:
        raise _unauthorized("Invalid or expired token")

    return response.user


CurrentUser = Annotated[User, Depends(get_current_user)]
