import io
import uuid
import wave
from datetime import datetime
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from rq import Queue
from rq.exceptions import NoSuchJobError
from rq.job import Job

from app.core.config import settings
from app.core.queue import get_queue
from app.core.supabase import get_supabase_admin_client
from app.services import storage
from app.workers import generate_audio_job, rewrite_job, transcribe_job
from app.workers.debug import failing_job, sleep_job

router = APIRouter(prefix="/debug", tags=["debug"])

DEBUG_PROJECT_ID = "debug-test-project"


class TestJobsResponse(BaseModel):
    jobs: dict[str, str]


class JobStatusResponse(BaseModel):
    job_id: str
    func_name: str | None
    status: str
    result: Any = None
    error: str | None = None
    enqueued_at: datetime | None
    started_at: datetime | None
    ended_at: datetime | None


@router.post("/test-job", response_model=TestJobsResponse)
def enqueue_test_jobs(
    queue: Annotated[Queue, Depends(get_queue)],
    include_failure: bool = False,
    sleep_seconds: Annotated[int, Query(ge=0, le=300)] = 0,
) -> TestJobsResponse:
    jobs = {
        "transcribe_job": queue.enqueue(transcribe_job, DEBUG_PROJECT_ID).id,
        "rewrite_job": queue.enqueue(rewrite_job, DEBUG_PROJECT_ID).id,
        "generate_audio_job": queue.enqueue(
            generate_audio_job, DEBUG_PROJECT_ID, generation_id="debug-test-generation"
        ).id,
    }
    if include_failure:
        jobs["failing_job"] = queue.enqueue(failing_job).id
    if sleep_seconds:
        jobs["sleep_job"] = queue.enqueue(sleep_job, sleep_seconds).id
    return TestJobsResponse(jobs=jobs)


@router.get("/test-job/{job_id}", response_model=JobStatusResponse)
def get_test_job_status(
    job_id: str,
    queue: Annotated[Queue, Depends(get_queue)],
) -> JobStatusResponse:
    try:
        job = Job.fetch(job_id, connection=queue.connection)
    except NoSuchJobError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        ) from exc

    job_status = job.get_status()
    return JobStatusResponse(
        job_id=job.id,
        func_name=job.func_name,
        status=job_status.value if job_status else "unknown",
        result=job.return_value(),
        error=job.exc_info,
        enqueued_at=job.enqueued_at,
        started_at=job.started_at,
        ended_at=job.ended_at,
    )


class UrlCheck(BaseModel):
    url: str | None
    status_code: int
    ok: bool
    body_snippet: str


class StorageTestResponse(BaseModel):
    path: str
    uploaded_bytes: int
    signed_url: UrlCheck
    public_url: UrlCheck
    unauthenticated_url: UrlCheck
    deleted: bool | None
    still_listed_after_delete: bool | None
    signed_url_after_delete: UrlCheck | None
    private_bucket_verified: bool


def _silent_wav(seconds: float = 1.0, rate: int = 8000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"\x00\x00" * int(seconds * rate))
    return buffer.getvalue()


def _check(
    client: httpx.Client, url: str, expected_body: bytes | None, show_url: bool
) -> UrlCheck:
    response = client.get(url)
    ok = response.status_code == 200 and (
        expected_body is None or response.content == expected_body
    )
    snippet = "" if response.status_code == 200 else response.text[:200]
    return UrlCheck(
        url=url if show_url else None,
        status_code=response.status_code,
        ok=ok,
        body_snippet=snippet,
    )


@router.post("/storage-test", response_model=StorageTestResponse)
def storage_test(keep: bool = False) -> StorageTestResponse:
    audio = _silent_wav()
    filename = f"storage-test-{uuid.uuid4().hex[:8]}.wav"
    path = storage.upload_file(
        storage.upload_path(DEBUG_PROJECT_ID, filename), audio, "audio/wav"
    )

    base = settings.supabase_url.rstrip("/")
    bucket_path = f"{storage.AUDIO_BUCKET}/{path}"
    with httpx.Client(timeout=15) as client:
        signed = _check(
            client, storage.get_signed_url(path, expires_in=300), audio, show_url=keep
        )
        public = _check(
            client,
            f"{base}/storage/v1/object/public/{bucket_path}",
            audio,
            show_url=True,
        )
        unauthenticated = _check(
            client, f"{base}/storage/v1/object/{bucket_path}", audio, show_url=True
        )

        deleted = still_listed = signed_after = None
        if not keep:
            signed_url_before_delete = storage.get_signed_url(path, expires_in=300)
            storage.delete_file(path)
            deleted = True
            listing = (
                get_supabase_admin_client()
                .storage.from_(storage.AUDIO_BUCKET)
                .list(f"uploads/{DEBUG_PROJECT_ID}", {"search": filename})
            )
            still_listed = any(item.get("name") == filename for item in listing)
            signed_after = _check(
                client, signed_url_before_delete, audio, show_url=False
            )

    return StorageTestResponse(
        path=path,
        uploaded_bytes=len(audio),
        signed_url=signed,
        public_url=public,
        unauthenticated_url=unauthenticated,
        deleted=deleted,
        still_listed_after_delete=still_listed,
        signed_url_after_delete=signed_after,
        private_bucket_verified=signed.ok and not public.ok and not unauthenticated.ok,
    )
