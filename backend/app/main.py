from fastapi import Depends, FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models as _models  # noqa: F401  register SQLAlchemy mappers
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.logging import configure_logging
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
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
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
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"error": "validation_error", "details": jsonable_encoder(details)},
        )

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
