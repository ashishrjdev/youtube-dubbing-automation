from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models as _models  # noqa: F401  register SQLAlchemy mappers
from app.core.auth import get_current_user
from app.routers import generations, projects, script_lines, speakers

app = FastAPI(title="dubbing-platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    return {"status": "ok"}
