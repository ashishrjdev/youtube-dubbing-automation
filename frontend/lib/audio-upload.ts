/** Client-side upload checks (PROJ-02). Server remains source of truth. */

export const DEFAULT_MAX_UPLOAD_MB = 50;
export const ALLOWED_UPLOAD_EXTENSIONS = [".mp3", ".wav", ".m4a"] as const;

export const UPLOAD_ACCEPT = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a";

export function extensionOfFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot).toLowerCase();
}

export function isAllowedUploadExtension(name: string): boolean {
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extensionOfFilename(name));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ClientUploadValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validateUploadFileClient(
  file: File,
  maxMb: number = DEFAULT_MAX_UPLOAD_MB,
): ClientUploadValidation {
  if (!file || file.size <= 0) {
    return { ok: false, message: "That file is empty." };
  }
  if (!isAllowedUploadExtension(file.name)) {
    return { ok: false, message: "Upload an MP3, WAV, or M4A file." };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return {
      ok: false,
      message: `That file is too large. The limit is ${maxMb} MB.`,
    };
  }
  return { ok: true };
}
