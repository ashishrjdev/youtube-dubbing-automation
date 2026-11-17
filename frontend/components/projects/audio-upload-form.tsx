"use client";

import { FileAudio2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { apiUpload } from "@/lib/api-upload";
import {
  DEFAULT_MAX_UPLOAD_MB,
  UPLOAD_ACCEPT,
  formatBytes,
  validateUploadFileClient,
} from "@/lib/audio-upload";
import { messageForProjectCreateError, PROJECT_ERROR_MESSAGES } from "@/lib/project-errors";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "checking";

export function AudioUploadForm() {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const busy = phase !== "idle";

  const clearFile = () => {
    setFile(null);
    setError(undefined);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickFile = (next: File | null) => {
    if (!next) {
      clearFile();
      return;
    }
    const check = validateUploadFileClient(next, DEFAULT_MAX_UPLOAD_MB);
    if (!check.ok) {
      setFile(null);
      setError(check.message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(next);
    setError(undefined);
    setProgress(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    pickFile(dropped);
  };

  const onZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (busy) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setProgress(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !file) return;

    const check = validateUploadFileClient(file, DEFAULT_MAX_UPLOAD_MB);
    if (!check.ok) {
      setError(check.message);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("uploading");
    setProgress(0);
    setError(undefined);

    try {
      const body = new FormData();
      body.append("file", file, file.name);

      const response = await apiUpload("/projects/upload", {
        formData: body,
        signal: controller.signal,
        onProgress: ({ percent }) => {
          if (percent != null) setProgress(percent);
          if (percent != null && percent >= 100) setPhase("checking");
        },
      });

      if (controller.signal.aborted) return;

      setPhase("checking");

      if (!response.ok) {
        setError(await messageForProjectCreateError(response));
        setPhase("idle");
        setProgress(null);
        return;
      }

      const project = (await response.json()) as Project;
      router.push(`/projects/${project.id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setPhase("idle");
        setProgress(null);
        return;
      }
      setError("Something went wrong, please try again");
      setPhase("idle");
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-controls={inputId}
        aria-label="Audio upload drop zone. Press Enter to browse files."
        onKeyDown={onZoneKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={cn(
          "grid gap-3 rounded-2xl border border-dashed border-border/80 bg-surface-container-low px-6 py-10 text-center outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring",
          dragOver && "border-primary bg-primary/5",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-card">
          <Upload className="size-5" aria-hidden="true" />
        </div>
        <div className="grid gap-1">
          <p className="text-body-md font-medium text-foreground">
            Drag and drop your audio here
          </p>
          <p className="text-body-sm text-muted-foreground">
            MP3, WAV or M4A, up to {DEFAULT_MAX_UPLOAD_MB} MB.
          </p>
          <p className="text-body-sm text-muted-foreground">
            WAV files are very large — for longer audio, export as MP3 or M4A.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileAudio2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-body-md font-medium text-foreground">{file.name}</p>
              <p className="text-body-sm text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" disabled={busy} onClick={clearFile}>
            Remove
          </Button>
        </div>
      ) : null}

      {phase === "uploading" || phase === "checking" ? (
        <div className="grid gap-2" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-body-sm text-muted-foreground">
            <span>{phase === "checking" ? "Checking file…" : "Uploading…"}</span>
            {progress != null && phase === "uploading" ? <span>{progress}%</span> : null}
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-container-low"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? undefined}
          >
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-[width]",
                phase === "checking" && "w-full animate-pulse",
              )}
              style={phase === "uploading" ? { width: `${progress ?? 0}%` } : undefined}
            />
          </div>
          {phase === "uploading" ? (
            <div>
              <Button type="button" variant="outline" size="sm" onClick={cancelUpload}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-body-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      {error === PROJECT_ERROR_MESSAGES.email_not_verified ? (
        <p className="text-body-sm text-muted-foreground">
          Check your inbox for the link, or{" "}
          <Link href="/verify-email" className="font-medium text-primary underline-offset-4 hover:underline">
            resend verification
          </Link>
          .
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !file}>
        {phase === "checking"
          ? "Checking file…"
          : phase === "uploading"
            ? "Uploading…"
            : "Start Processing"}
      </Button>
    </form>
  );
}
