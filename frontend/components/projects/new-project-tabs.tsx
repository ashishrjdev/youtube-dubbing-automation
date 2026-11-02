"use client";

import { useState } from "react";

import { YoutubeUrlForm } from "@/components/projects/youtube-url-form";
import { Badge } from "@/components/ui/badge";
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
          aria-selected={false}
          aria-disabled="true"
          disabled
          id="tab-upload"
          className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-label-md text-muted-foreground/70"
        >
          Upload audio
          <Badge variant="secondary">Coming next</Badge>
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
    </div>
  );
}
