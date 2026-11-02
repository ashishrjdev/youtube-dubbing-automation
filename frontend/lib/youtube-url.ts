/**
 * Client-side YouTube URL checks (PROJ-01). Mirror the server rules in
 * `parse_youtube_url` but must not be stricter — the server is source of truth.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export const YOUTUBE_INVALID_MESSAGE = "That doesn't look like a YouTube video link.";

export function parseYoutubeUrlClient(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.port) return null;

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  let videoId: string | null = null;
  const pathParts = parsed.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    videoId = pathParts[0] ?? null;
  } else if (pathParts[0] === "watch") {
    videoId = parsed.searchParams.get("v");
    if (!videoId && parsed.searchParams.has("list")) return null;
  } else if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
    videoId = pathParts[1] ?? null;
  } else if (pathParts[0] === "playlist") {
    return null;
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) return null;
  return videoId;
}

export function isValidYoutubeUrlClient(raw: string): boolean {
  return parseYoutubeUrlClient(raw) !== null;
}
