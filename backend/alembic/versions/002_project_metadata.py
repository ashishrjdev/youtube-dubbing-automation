"""project metadata columns (PROJ-01)

Revision ID: 002_project_metadata
Revises: 001_initial
Create Date: 2026-11-01

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_project_metadata"
down_revision: str | Sequence[str] | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("title", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("duration_seconds", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("thumbnail_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "thumbnail_url")
    op.drop_column("projects", "duration_seconds")
    op.drop_column("projects", "title")
