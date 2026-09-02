from app.workers import generate_audio_job, rewrite_job, transcribe_job


def test_worker_stubs_log_without_raising() -> None:
    transcribe_job("project-1")
    rewrite_job("project-1")
    generate_audio_job("project-1", generation_id="gen-1")
