#!/usr/bin/env python3
"""Insert fake dashboard projects for local UI work (PROJ-03).

Refuses to run unless ``ENVIRONMENT == development``.

Examples::

    cd backend
    .venv/bin/python -m scripts.seed_projects --email you@example.com --count 45
    .venv/bin/python -m scripts.seed_projects --user-id <uuid> --count 45
"""

from __future__ import annotations

import argparse
import logging
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from supabase import create_client

from app.core.config import settings
from app.core.database import get_session_factory
from app.core.logging import configure_logging
from app.models.project import Project, ProjectStatus, SourceType

logger = logging.getLogger(__name__)

# Varied titles — long, unicode, and HTML-looking (must render as plain text).
TITLE_SAMPLES = [
    "Short clip",
    "A very long title that should truncate nicely on the dashboard card when it wraps past two lines of text in the UI",
    "Café résumé — 日本語タイトル 🎤",
    "<b>test</b>",
    "Script with <script>alert(1)</script> looking text",
    "Spaces   and   punctuation!!!",
    "emoji-only 🚀🎧✨",
    None,  # Untitled
]

THUMB_SAMPLES = [
    "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    None,
    None,
]


def _resolve_user_id(*, user_id: str | None, email: str | None) -> uuid.UUID:
    if user_id:
        return uuid.UUID(user_id)
    if not email:
        raise SystemExit("Provide --user-id or --email")
    if not settings.supabase_url or not settings.supabase_service_key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_KEY are required to look up email")
    admin = create_client(settings.supabase_url, settings.supabase_service_key)
    # Paginate admin users until we find the email (fine for local seed sizes).
    page = 1
    per_page = 200
    while True:
        result = admin.auth.admin.list_users(page=page, per_page=per_page)
        users = getattr(result, "users", None) or result
        if not users:
            break
        for user in users:
            if (getattr(user, "email", None) or "").lower() == email.lower():
                return uuid.UUID(str(user.id))
        if len(users) < per_page:
            break
        page += 1
    raise SystemExit(f"No Supabase user found for email {email!r}")


def seed_projects(*, owner_id: uuid.UUID, count: int) -> int:
    statuses = list(ProjectStatus)
    session = get_session_factory()()
    now = datetime.now(UTC)
    created = 0
    try:
        for i in range(count):
            status = statuses[i % len(statuses)]
            title = TITLE_SAMPLES[i % len(TITLE_SAMPLES)]
            thumb = THUMB_SAMPLES[i % len(THUMB_SAMPLES)]
            source_type = (
                SourceType.upload.value if i % 3 == 0 else SourceType.youtube_url.value
            )
            if source_type == SourceType.upload.value:
                source_ref = f"uploads/{uuid.uuid4()}/source.mp3"
                thumb = None
            else:
                source_ref = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
            # Spread updated_at so ordering / relative times look realistic.
            updated = now - timedelta(hours=i * 3, minutes=i * 7)
            project = Project(
                id=uuid.uuid4(),
                user_id=owner_id,
                source_type=source_type,
                source_ref=source_ref,
                title=title,
                duration_seconds=30 + (i * 17) % 7200,
                thumbnail_url=thumb,
                status=status.value,
                created_at=updated - timedelta(days=1),
                updated_at=updated,
            )
            session.add(project)
            created += 1
        session.commit()
    finally:
        session.close()
    return created


def main() -> None:
    configure_logging()
    if settings.environment != "development":
        raise SystemExit(
            f"Refusing to seed: ENVIRONMENT={settings.environment!r} (must be 'development')"
        )

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", help="Supabase auth user UUID")
    parser.add_argument("--email", help="Look up the user by email via the service role")
    parser.add_argument("--count", type=int, default=45, help="Number of projects to insert")
    args = parser.parse_args()
    if args.count < 1:
        raise SystemExit("--count must be >= 1")

    owner = _resolve_user_id(user_id=args.user_id, email=args.email)
    n = seed_projects(owner_id=owner, count=args.count)
    print(f"Seeded {n} project(s) for user {owner}")


if __name__ == "__main__":
    main()
