import logging
import sys

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models as _models  # noqa: F401  register SQLAlchemy mappers
from app.core.auth import get_current_user
from app.core.config import settings
from app.routers import generations, projects, script_lines, speakers


def configure_logging() -> None:
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force=True,
    )


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

    protected = [Depends(get_current_user)]
    app.include_router(projects.router, dependencies=protected)
    app.include_router(script_lines.router, dependencies=protected)
    app.include_router(speakers.router, dependencies=protected)
    app.include_router(generations.router, dependencies=protected)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "environment": settings.environment}

    return app


app = create_app()
