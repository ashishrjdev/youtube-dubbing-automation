import pytest

from app.services.youtube import YoutubeServiceError, parse_youtube_url

VIDEO_ID = "dQw4w9WgXcQ"


@pytest.mark.parametrize(
    "url",
    [
        f"https://www.youtube.com/watch?v={VIDEO_ID}",
        f"https://youtube.com/watch?v={VIDEO_ID}",
        f"http://m.youtube.com/watch?v={VIDEO_ID}",
        f"https://www.youtube.com/watch?feature=share&v={VIDEO_ID}&t=42",
        f"https://www.youtube.com/watch?v={VIDEO_ID}&list=PLxxxxxxxx",
        f"https://youtu.be/{VIDEO_ID}",
        f"https://youtu.be/{VIDEO_ID}?si=abc123",
        f"https://www.youtube.com/shorts/{VIDEO_ID}",
        f"https://m.youtube.com/shorts/{VIDEO_ID}?feature=share",
        f"https://www.youtube.com/embed/{VIDEO_ID}",
        f"  https://youtu.be/{VIDEO_ID}  ",
    ],
)
def test_parse_accepts_valid_shapes(url: str) -> None:
    assert parse_youtube_url(url) == VIDEO_ID


@pytest.mark.parametrize(
    "url",
    [
        "",
        "   ",
        "not a url",
        "javascript:alert(1)",
        "file:///etc/passwd",
        "ftp://youtube.com/watch?v=" + VIDEO_ID,
        f"https://vimeo.com/{VIDEO_ID}",
        f"https://youtube.com.evil.com/watch?v={VIDEO_ID}",
        f"https://evil.com/youtube.com/watch?v={VIDEO_ID}",
        f"https://music.youtube.com/watch?v={VIDEO_ID}",
        f"https://www.youtube.com/live/{VIDEO_ID}",
        "https://www.youtube.com/playlist?list=PLxxxxxxxx",
        "https://www.youtube.com/watch?list=PLxxxxxxxx",
        f"https://user:pass@www.youtube.com/watch?v={VIDEO_ID}",
        f"https://www.youtube.com:8443/watch?v={VIDEO_ID}",
        "https://www.youtube.com/watch?v=short",
        "https://www.youtube.com/watch?v=toolongvideoid1",
        "https://youtu.be/short",
        "youtube.com/watch?v=" + VIDEO_ID,  # no scheme
        f"https://youtu.be/{VIDEO_ID} extra",
        "--exec=rm -rf / https://youtu.be/" + VIDEO_ID,
        "x" * 3000,
    ],
)
def test_parse_rejects_invalid(url: str) -> None:
    with pytest.raises(YoutubeServiceError) as exc_info:
        parse_youtube_url(url)
    assert exc_info.value.code == "invalid_url"
