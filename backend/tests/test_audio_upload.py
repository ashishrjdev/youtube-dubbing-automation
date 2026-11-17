from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.services import audio_upload as audio_upload_mod
from app.services.audio_upload import (
    AudioUploadError,
    extension_for_filename,
    probe_audio,
    sanitize_upload_title,
    source_storage_filename,
)


@pytest.mark.parametrize(
    ("name", "ext"),
    [
        ("track.mp3", ".mp3"),
        ("TRACK.WAV", ".wav"),
        ("clip.M4A", ".m4a"),
        ("path/to/song.mp3", ".mp3"),
    ],
)
def test_allowed_extensions(name: str, ext: str) -> None:
    assert extension_for_filename(name) == ext
    assert source_storage_filename(ext) == f"source{ext}"


@pytest.mark.parametrize(
    "name",
    ["track.aac", "track.mp4", "track", "track.exe", ""],
)
def test_disallowed_extensions(name: str) -> None:
    with pytest.raises(AudioUploadError) as exc_info:
        extension_for_filename(name)
    assert exc_info.value.code == "unsupported_file_type"
    assert exc_info.value.status_code == 415


def test_sanitize_upload_title_cases() -> None:
    assert sanitize_upload_title("../../evil.mp3") == "evil"
    assert sanitize_upload_title("a" * 200 + ".wav") == "a" * 120
    assert sanitize_upload_title("café session.m4a") == "café session"
    assert sanitize_upload_title("bad\x00name.mp3") == "badname"
    assert sanitize_upload_title(".mp3") == "Uploaded audio"
    assert sanitize_upload_title(None) == "Uploaded audio"
    # Storage path never includes the original name.
    assert "evil" not in source_storage_filename(".mp3")
    assert source_storage_filename(".mp3") == "source.mp3"


def test_probe_rejects_no_audio_stream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "x.mp3"
    path.write_bytes(b"not-audio")

    def fake_run(*args, **kwargs):
        return MagicMock(
            returncode=0,
            stdout='{"streams":[{"codec_type":"video"}],"format":{"duration":"12.0"}}',
            stderr="",
        )

    monkeypatch.setattr(audio_upload_mod.subprocess, "run", fake_run)
    with pytest.raises(AudioUploadError) as exc_info:
        probe_audio(path)
    assert exc_info.value.code == "file_corrupt"


def test_probe_rejects_ffprobe_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "x.mp3"
    path.write_bytes(b"text pretending to be mp3")

    def fake_run(*args, **kwargs):
        return MagicMock(returncode=1, stdout="", stderr="Invalid data")

    monkeypatch.setattr(audio_upload_mod.subprocess, "run", fake_run)
    with pytest.raises(AudioUploadError) as exc_info:
        probe_audio(path)
    assert exc_info.value.code == "file_corrupt"


def test_probe_rejects_too_long(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "long.wav"
    path.write_bytes(b"RIFF")
    monkeypatch.setattr(audio_upload_mod.settings, "max_video_minutes", 1)

    def fake_run(*args, **kwargs):
        return MagicMock(
            returncode=0,
            stdout='{"streams":[{"codec_type":"audio","duration":"120.0"}],"format":{"duration":"120.0"}}',
            stderr="",
        )

    monkeypatch.setattr(audio_upload_mod.subprocess, "run", fake_run)
    with pytest.raises(AudioUploadError) as exc_info:
        probe_audio(path)
    assert exc_info.value.code == "audio_too_long"


def test_probe_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "ok.mp3"
    path.write_bytes(b"ID3")

    def fake_run(*args, **kwargs):
        # Ensure argv uses a list and ends with -- path (SEC-04).
        cmd = args[0]
        assert isinstance(cmd, list)
        assert cmd[0] == "ffprobe"
        assert "--" in cmd
        assert cmd[-1] == str(path)
        return MagicMock(
            returncode=0,
            stdout='{"streams":[{"codec_type":"audio"}],"format":{"duration":"42.7"}}',
            stderr="",
        )

    monkeypatch.setattr(audio_upload_mod.subprocess, "run", fake_run)
    probed = probe_audio(path)
    assert probed.duration_seconds == 42
    assert probed.has_audio is True
