from starlette.datastructures import MutableHeaders
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings

SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}

# Platform health checks call the container directly over plain HTTP with no
# X-Forwarded-Proto, so redirecting them would mark the service unhealthy.
HTTPS_REDIRECT_EXEMPT_PATHS = frozenset({"/health"})


class InsecureProductionConfig(RuntimeError):
    pass


def check_production_https_config(settings: Settings) -> None:
    """Refuse to start the API in production with settings that break HTTPS."""
    insecure = [
        o for o in settings.cors_origin_list if not o.lower().startswith("https://")
    ]
    if insecure:
        raise InsecureProductionConfig(
            f"CORS_ORIGINS must only contain https:// origins in production, got: {insecure}"
        )
    if not settings.forwarded_allow_ips.strip():
        raise InsecureProductionConfig(
            "FORWARDED_ALLOW_IPS must be set in production so uvicorn trusts the "
            "platform proxy's X-Forwarded-Proto; without it the HTTPS redirect loops"
        )


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                headers = MutableHeaders(scope=message)
                for key, value in SECURITY_HEADERS.items():
                    headers.setdefault(key, value)
            await send(message)

        await self.app(scope, receive, send_with_headers)


class HTTPSRedirectExceptHealthMiddleware(HTTPSRedirectMiddleware):
    """Redirects http:// to https://.

    Relies on scope["scheme"], which is only "https" behind a TLS-terminating
    proxy if uvicorn trusts that proxy's X-Forwarded-Proto (FORWARDED_ALLOW_IPS).
    Otherwise every request redirects to itself forever.
    """

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] in HTTPS_REDIRECT_EXEMPT_PATHS:
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)
