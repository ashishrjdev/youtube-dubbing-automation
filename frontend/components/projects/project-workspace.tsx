"use client";

import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

import { TextLink } from "@/components/text-link";
import { Badge } from "@/components/ui/badge";
import { useApiFetch } from "@/lib/api";
import { formatDuration, type Project } from "@/lib/projects";

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const apiFetch = useApiFetch();
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch(`/projects/${projectId}`);
        if (cancelled) return;
        if (response.status === 404) {
          setMissing(true);
          return;
        }
        if (!response.ok) {
          setLoadError(true);
          return;
        }
        setProject((await response.json()) as Project);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, projectId]);

  if (missing) {
    notFound();
  }

  if (loadError) {
    return (
      <div className="grid gap-4">
        <p className="text-body-md text-muted-foreground">
          Something went wrong loading this project. Please try again.
        </p>
        <TextLink href="/dashboard">Back to Dashboard</TextLink>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center gap-2 text-body-md text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading project…
      </div>
    );
  }

  const title = project.title?.trim() || "Untitled project";

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 flex-1 gap-2">
          <h2 className="text-h3 text-foreground">{title}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="warning" className="gap-1.5">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Transcribing…
            </Badge>
            <span className="text-body-sm text-muted-foreground">
              {formatDuration(project.duration_seconds)}
            </span>
          </div>
        </div>
        <TextLink href="/dashboard" variant="subtle">
          Back to Dashboard
        </TextLink>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-start">
        {project.thumbnail_url ? (
          <div className="aspect-video overflow-hidden rounded-xl border border-border/70 bg-surface-container-low shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary YouTube CDN hosts */}
            <img
              src={project.thumbnail_url}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-surface-container-low text-body-sm text-muted-foreground">
            No thumbnail
          </div>
        )}

        <dl className="grid gap-4 text-body-md">
          <div>
            <dt className="text-label-sm text-muted-foreground">Source</dt>
            <dd className="mt-1">
              <a
                href={project.source_ref}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-primary underline-offset-4 hover:underline"
              >
                {project.source_ref}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-label-sm text-muted-foreground">Duration</dt>
            <dd className="mt-1 text-foreground">{formatDuration(project.duration_seconds)}</dd>
          </div>
        </dl>
      </div>

      <p className="text-body-sm text-muted-foreground">
        Transcription is queued. Live progress lands in a later update (TRANS-03).
      </p>
    </div>
  );
}
