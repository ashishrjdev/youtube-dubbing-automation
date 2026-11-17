"""projects (user_id, updated_at DESC) index (PROJ-03)

Revision ID: 003_projects_user_updated_index
Revises: 002_project_metadata
Create Date: 2026-11-17

"""

from collections.abc import Sequence

from alembic import op

revision: str = "003_projects_user_updated_index"
down_revision: str | Sequence[str] | None = "002_project_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INDEX_NAME = "ix_projects_user_id_updated_at"


def upgrade() -> None:
    # Dashboard lists a user's projects ordered by updated_at DESC.
    op.create_index(
        INDEX_NAME,
        "projects",
        ["user_id", "updated_at"],
        unique=False,
        postgresql_ops={"updated_at": "DESC"},
    )


def downgrade() -> None:
    op.drop_index(INDEX_NAME, table_name="projects")
