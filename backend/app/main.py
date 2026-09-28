from fastapi import Depends, FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models as _models  # noqa: F401  register SQLAlchemy mappers
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.logging import configure_logging
from app.routers import debug, generations, me, projects, script_lines, speakers


def create_app() -> FastAPI:
    configure_logging()

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

    @app.exception_handler(RequestValidationError)
    async def validation_error_without_input(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # FastAPI's default 422 echoes the submitted value (e.g. a password) back
        # in each error's "input"; loc/msg/type are enough for clients.
        errors = [
            {k: v for k, v in error.items() if k not in ("input", "ctx")}
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": jsonable_encoder(errors)},
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
