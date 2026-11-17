#!/usr/bin/env python3
"""Delete orphaned temporary upload objects older than 24 hours (PROJ-02).

An object under ``uploads/{project_id}/`` is removed when:
- no matching project row exists, or
- the project is no longer in ``transcribing`` status,

AND the object is older than 24 hours.

Run manually for now (scheduling comes later)::

    cd backend && .venv/bin/python -m scripts.cleanup_orphan_uploads

Optional::

    .venv/bin/python -m scripts.cleanup_orphan_uploads --dry-run
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

# Allow `python -m scripts.cleanup_orphan_uploads` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import get_session_factory
from app.core.logging import configure_logging
from app.models.project import Project, ProjectStatus
from app.services import storage

logger = logging.getLogger(__name__)

ORPHAN_AGE = timedelta(hours=24)


def _parse_timestamp(value: object) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    text = value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def cleanup_orphans(*, dry_run: bool = False, now: datetime | None = None) -> int:
    configure_logging()
    cutoff = (now or datetime.now(UTC)) - ORPHAN_AGE
    session = get_session_factory()()
    deleted = 0
    try:
        folders = storage.list_upload_project_folders()
        for folder in folders:
            try:
                project_id = UUID(folder)
            except ValueError:
                logger.warning("Skipping non-UUID upload folder=%s", folder)
                continue

            project = session.get(Project, project_id)
            keep = (
                project is not None
                and project.status == ProjectStatus.transcribing.value
                and project.source_type == "upload"
            )
            if keep:
                continue

            for obj in storage.list_upload_objects(folder):
                name = obj.get("name")
                if not name:
                    continue
                updated = _parse_timestamp(obj.get("updated_at") or obj.get("created_at"))
                if updated is None or updated > cutoff:
                    continue
                path = storage.upload_path(folder, str(name))
                if dry_run:
                    logger.info("dry-run would delete %s", path)
                    deleted += 1
                    continue
                try:
                    storage.delete_file(path)
                    deleted += 1
                    logger.info("Deleted orphan upload %s", path)
                except storage.StorageError:
                    logger.exception("Failed to delete orphan %s", path)
    finally:
        session.close()
    return deleted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List orphans that would be deleted without removing them",
    )
    args = parser.parse_args()
    count = cleanup_orphans(dry_run=args.dry_run)
    print(f"{'Would delete' if args.dry_run else 'Deleted'} {count} orphan object(s)")


if __name__ == "__main__":
    main()
