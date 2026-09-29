import type { Metadata } from "next";
import { FileAudio, Video, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "New project",
};

const SOURCES: { icon: LucideIcon; title: string; description: string; hint: string }[] = [
  {
    icon: Video,
    title: "YouTube link",
    description: "Paste the URL of a public video and we'll pull the audio for you.",
    hint: "youtube.com/watch?v=… or youtu.be/…",
  },
  {
    icon: FileAudio,
    title: "Upload audio",
    description: "Upload the original audio track from your computer.",
    hint: "MP3, WAV or M4A",
  },
];

export default function NewProjectPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        back={{ href: "/dashboard", label: "Back to projects" }}
        title="New project"
        description="Choose where your source audio comes from."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map(({ icon: Icon, title, description, hint }) => (
          <div
            key={title}
            aria-disabled="true"
            className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-6 shadow-card"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <div className="grid gap-1.5">
              <h2 className="text-body-lg font-semibold text-foreground">{title}</h2>
              <p className="text-body-md text-muted-foreground">{description}</p>
            </div>
            <p className="mt-auto rounded-lg bg-surface-container-low px-3 py-2 font-mono text-body-sm text-muted-foreground">
              {hint}
            </p>
          </div>
        ))}
      </div>

      <p className="text-body-sm text-muted-foreground">
        Project creation is on its way. Once it&apos;s live, you&apos;ll start a project here and
        follow it through transcription, script review, and voice generation.
      </p>
    </div>
  );
}
