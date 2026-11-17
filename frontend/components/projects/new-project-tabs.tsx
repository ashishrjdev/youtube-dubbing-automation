"use client";

import { useState } from "react";

import { AudioUploadForm } from "@/components/projects/audio-upload-form";
import { YoutubeUrlForm } from "@/components/projects/youtube-url-form";
import { cn } from "@/lib/utils";

type Tab = "youtube" | "upload";

export function NewProjectTabs() {
  const [tab, setTab] = useState<Tab>("youtube");

  return (
    <div className="grid gap-6">
      <div
        role="tablist"
        aria-label="Source type"
        className="flex gap-1 rounded-xl border border-border/70 bg-surface-container-low p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "youtube"}
          id="tab-youtube"
          aria-controls="panel-youtube"
          onClick={() => setTab("youtube")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === "youtube"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          YouTube URL
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upload"}
          id="tab-upload"
          aria-controls="panel-upload"
          onClick={() => setTab("upload")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === "upload"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Upload audio
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-youtube"
        aria-labelledby="tab-youtube"
        hidden={tab !== "youtube"}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-card sm:p-8"
      >
        <div className="mb-6 grid gap-1">
          <h2 className="text-body-lg font-semibold text-foreground">Paste a YouTube link</h2>
          <p className="text-body-md text-muted-foreground">
            We’ll pull the audio and start transcription. Public videos only for now.
          </p>
        </div>
        <YoutubeUrlForm />
      </div>

      <div
        role="tabpanel"
        id="panel-upload"
        aria-labelledby="tab-upload"
        hidden={tab !== "upload"}
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-card sm:p-8"
      >
        <div className="mb-6 grid gap-1">
          <h2 className="text-body-lg font-semibold text-foreground">Upload audio</h2>
          <p className="text-body-md text-muted-foreground">
            Source audio is only kept long enough to transcribe, then deleted.
          </p>
        </div>
        <AudioUploadForm />
      </div>
    </div>
  );
}
