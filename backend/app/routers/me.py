from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.auth import CurrentUser

router = APIRouter(tags=["me"])


class MeResponse(BaseModel):
    id: UUID
    email: str | None


@router.get("/me", response_model=MeResponse)
def read_me(user: CurrentUser) -> MeResponse:
    return MeResponse(id=user.id, email=user.email)
