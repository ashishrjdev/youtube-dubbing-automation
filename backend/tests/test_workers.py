from types import SimpleNamespace
from uuid import uuid4

from app.models.project import ProjectStatus, SourceType
from app.workers import generate_audio_job, rewrite_job, transcribe_job


def test_worker_stubs_log_without_raising(monkeypatch) -> None:
    project = SimpleNamespace(
        id=uuid4(),
        source_type=SourceType.youtube_url.value,
        source_ref="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status=ProjectStatus.transcribing.value,
    )

    class FakeSession:
        def get(self, model, pk):
            return project

        def close(self):
            return None

    deleted: list = []
    monkeypatch.setattr(
        "app.workers.transcription.get_session_factory",
        lambda: (lambda: FakeSession()),
    )
    monkeypatch.setattr(
        "app.workers.transcription.delete_source_audio",
        lambda p: deleted.append(p),
    )

    transcribe_job(str(project.id))
    assert deleted == [project]

    rewrite_job("project-1")
    generate_audio_job("project-1", generation_id="gen-1")


def test_transcribe_job_deletes_upload_source_even_on_error(monkeypatch) -> None:
    project = SimpleNamespace(
        id=uuid4(),
        source_type=SourceType.upload.value,
        source_ref=f"uploads/{uuid4()}/source.mp3",
        status=ProjectStatus.transcribing.value,
    )

    class FakeSession:
        def get(self, model, pk):
            return project

        def close(self):
            return None

    calls: list = []
    monkeypatch.setattr(
        "app.workers.transcription.get_session_factory",
        lambda: (lambda: FakeSession()),
    )
    monkeypatch.setattr(
        "app.workers.transcription.delete_source_audio",
        lambda p: calls.append(p.source_ref),
    )

    # Force work after load to fail; finally must still delete source audio.
    def boom(*args, **kwargs):
        raise RuntimeError("stub failed")

    monkeypatch.setattr(
        "app.workers.transcription.logger.info",
        boom,
    )
    try:
        transcribe_job(str(project.id))
    except RuntimeError:
        pass
    assert calls == [project.source_ref]
