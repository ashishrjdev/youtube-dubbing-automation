import { BACKEND_SERVER_ERROR_MESSAGE, messageForBackendFailure } from "@/lib/backend-errors";
import { DEFAULT_MAX_UPLOAD_MB } from "@/lib/audio-upload";

/** Default max length shown in the too-long message (matches backend default). */
export const DEFAULT_MAX_VIDEO_MINUTES = 60;

const MESSAGES: Record<string, string> = {
  invalid_url: "That doesn't look like a YouTube video link.",
  video_unavailable: "That video is private, deleted, or unavailable.",
  video_restricted: "That video is age-restricted or requires signing in to view.",
  video_live: "Live streams and premieres that haven't aired yet can't be dubbed.",
  video_too_long: `Videos longer than ${DEFAULT_MAX_VIDEO_MINUTES} minutes aren't supported yet.`,
  youtube_unreachable: "We couldn't reach YouTube, please try again.",
  extraction_failed: "We couldn't read that video's details. Please try again.",
  email_not_verified: "Please verify your email before creating a project.",
  queue_unavailable: "We couldn't start processing. Please try again in a moment.",
  file_too_large: `That file is too large. The limit is ${DEFAULT_MAX_UPLOAD_MB} MB.`,
  unsupported_file_type: "Upload an MP3, WAV, or M4A file.",
  file_empty: "That file is empty.",
  file_corrupt: "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
  audio_too_long: `Audio longer than ${DEFAULT_MAX_VIDEO_MINUTES} minutes isn't supported yet.`,
  storage_failed: "We couldn't store that file. Please try again in a moment.",
};

export type ProjectApiErrorBody = {
  error?: string;
  message?: string;
};

/**
 * Map a create-project API failure to inline copy. Never print the raw body for 5xx.
 */
export async function messageForProjectCreateError(response: Response): Promise<string> {
  const server = messageForBackendFailure(response);
  if (server) return server;

  let body: ProjectApiErrorBody = {};
  try {
    body = (await response.json()) as ProjectApiErrorBody;
  } catch {
    return BACKEND_SERVER_ERROR_MESSAGE;
  }

  const code = body.error;
  if (code && code in MESSAGES) {
    if (
      (code === "video_too_long" || code === "audio_too_long" || code === "file_too_large") &&
      body.message
    ) {
      return body.message;
    }
    return MESSAGES[code];
  }
  if (body.message) return body.message;
  return BACKEND_SERVER_ERROR_MESSAGE;
}

export { MESSAGES as PROJECT_ERROR_MESSAGES };
