"""Standard API error responses (LEGAL-04).

Every error body is ``{"error": "<code>", "request_id": "..."}`` (plus optional
safe fields like validation ``details`` or a 4xx ``message``). Unhandled
exceptions never include a traceback, exception message, or file path in the
response — those stay in the server logs, keyed by the same ``request_id``.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"

_STATUS_ERROR_CODES: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_422_UNPROCESSABLE_CONTENT: "validation_error",
    status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "internal_error",
    status.HTTP_501_NOT_IMPLEMENTED: "not_implemented",
    status.HTTP_503_SERVICE_UNAVAILABLE: "service_unavailable",
}


def get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if isinstance(request_id, str) and request_id:
        return request_id
    return str(uuid.uuid4())


def error_body(error: str, request_id: str, **extra: Any) -> dict[str, Any]:
    body: dict[str, Any] = {"error": error, "request_id": request_id}
    body.update(extra)
    return body


def error_response(
    status_code: int,
    error: str,
    request_id: str,
    *,
    headers: dict[str, str] | None = None,
    **extra: Any,
) -> JSONResponse:
    response_headers = {REQUEST_ID_HEADER: request_id}
    if headers:
        response_headers.update(headers)
    return JSONResponse(
        status_code=status_code,
        content=error_body(error, request_id, **extra),
        headers=response_headers,
    )


def http_exception_error_code(status_code: int) -> str:
    return _STATUS_ERROR_CODES.get(status_code, "http_error")


def http_exception_response(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = get_request_id(request)
    code = http_exception_error_code(exc.status_code)
    extra: dict[str, Any] = {}

    # 4xx string details are intentional client copy (e.g. "Email not verified").
    # Never forward detail on 5xx — it may echo internals.
    if (
        isinstance(exc.detail, str)
        and status.HTTP_400_BAD_REQUEST <= exc.status_code < status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        extra["message"] = exc.detail
    elif isinstance(exc.detail, dict):
        # Allow handlers to pass structured safe fields without a bare "detail".
        for key, value in exc.detail.items():
            if key in {"error", "request_id"}:
                continue
            extra[key] = value
        if isinstance(exc.detail.get("error"), str):
            code = exc.detail["error"]

    headers = dict(exc.headers) if exc.headers else None
    return error_response(exc.status_code, code, request_id, headers=headers, **extra)


def unhandled_exception_response(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_request_id(request)
    # Full traceback server-side only, correlated by request_id.
    logger.exception(
        "Unhandled exception request_id=%s path=%s",
        request_id,
        request.url.path,
        exc_info=exc,
    )
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        request_id,
    )
