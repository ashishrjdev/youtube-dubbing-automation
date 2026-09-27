from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from rq import Queue
from rq.exceptions import NoSuchJobError
from rq.job import Job

from app.core.queue import get_queue
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found") from exc

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
