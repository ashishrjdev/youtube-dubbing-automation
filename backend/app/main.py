from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import models as _models  # noqa: F401  register SQLAlchemy mappers
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.errors import (
    error_response,
    get_request_id,
    http_exception_response,
    unhandled_exception_response,
)
from app.core.logging import configure_logging
from app.core.request_id import RequestIdMiddleware
from app.core.security import (
    HTTPSRedirectExceptHealthMiddleware,
    SecurityHeadersMiddleware,
    check_production_https_config,
)
from app.routers import debug, generations, me, projects, script_lines, speakers


def create_app() -> FastAPI:
    configure_logging()
    if settings.is_production:
        check_production_https_config(settings)

    app = FastAPI(
        title="dubbing-platform",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        # Never expose FastAPI's interactive exception pages; we always return
        # the standard JSON error shape (LEGAL-04 / INFRA-02).
        debug=False,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Outermost (added last) runs first on the request.
    app.add_middleware(RequestIdMiddleware)
    if settings.is_production:
        # Added last = outermost, so redirects also carry the security headers.
        app.add_middleware(HTTPSRedirectExceptHealthMiddleware)
        app.add_middleware(SecurityHeadersMiddleware)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # FastAPI's default 422 echoes the submitted value (e.g. a password) back
        # in each error's "input"; loc/msg/type are enough for clients.
        details = [
            {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]
        return error_response(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "validation_error",
            get_request_id(request),
            details=jsonable_encoder(details),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        return http_exception_response(request, exc)

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        # Unknown routes and other Starlette 404s land here (not FastAPI's
        # HTTPException subclass in every version).
        return http_exception_response(
            request,
            HTTPException(status_code=exc.status_code, detail=exc.detail, headers=exc.headers),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return unhandled_exception_response(request, exc)

    app.include_router(me.router)

    protected = [Depends(get_current_user)]
    app.include_router(projects.router, dependencies=protected)
    app.include_router(script_lines.router, dependencies=protected)
    app.include_router(speakers.router, dependencies=protected)
    app.include_router(generations.router, dependencies=protected)

    if settings.is_development:
        app.include_router(debug.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "environment": settings.environment}

    return app


app = create_app()
