"use client";

import {
  ArrowUpRight,
  CirclePlay,
  Clock3,
  FileAudio2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { TextLink } from "@/components/text-link";
import { Waveform } from "@/components/waveform";
import { useApiFetch } from "@/lib/api";
import { formatDuration, type Project } from "@/lib/projects";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/relative-time";
import { projectStatusPill } from "@/lib/project-status";
import { cn } from "@/lib/utils";

function WorkspaceSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading project">
      <div className="overflow-hidden rounded-[1.75rem] bg-card ring-1 ring-[#0b1c30]/6">
        <div className="aspect-[21/9] min-h-[220px] bg-[linear-gradient(110deg,#e5eeff_25%,#f8f9ff_40%,#e5eeff_55%)] bg-[length:200%_100%] animate-[studio-shimmer_1.4s_linear_infinite]" />
        <div className="grid gap-4 p-6 sm:p-8">
          <div className="h-8 w-2/3 rounded-lg bg-surface-container-high/80" />
          <div className="h-4 w-1/3 rounded-md bg-surface-container/90" />
        </div>
      </div>
    </div>
  );
}

function WorkspaceError() {
  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-[1.75rem] border border-destructive/15 bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_60%)] px-6 py-12 text-center shadow-[0_20px_50px_-28px_rgb(186_26_26/0.3)] sm:px-10"
    >
      <div
        className="pointer-events-none absolute -left-12 top-0 size-40 rounded-full bg-destructive/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-md animate-[studio-rise_0.5s_ease-out_both]">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-error-container text-on-error-container">
          <RefreshCw className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-body-md text-muted-foreground">
          We couldn’t load this project. Please try again in a moment.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button type="button" size="lg" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="outline" size="lg">
            Back to projects
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

const PIPELINE = [
  { key: "created", label: "Start" },
  { key: "transcribing", label: "Transcribe" },
  { key: "name_review", label: "Names" },
  { key: "script_review", label: "Script" },
  { key: "voice_mapping", label: "Voices" },
  { key: "audio_generating", label: "Audio" },
  { key: "completed", label: "Done" },
] as const;

function pipelineIndex(status: string): number {
  if (status === "failed") return -1;
  if (status === "approved") return 4; // voice mapping
  const idx = PIPELINE.findIndex((s) => s.key === status);
  return idx;
}

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
    return <WorkspaceError />;
  }

  if (!project) {
    return <WorkspaceSkeleton />;
  }

  const title = project.title?.trim() || "Untitled project";
  const isUpload = project.source_type === "upload";
  const hasThumb = Boolean(project.thumbnail_url) && !isUpload;
  const duration = formatDuration(project.duration_seconds);
  const relative = formatRelativeTime(project.updated_at);
  const absolute = formatAbsoluteTime(project.updated_at);
  const statusLabel = projectStatusPill(project.status).label;
  const step = pipelineIndex(project.status);
  const failed = project.status === "failed";

  return (
    <div className="relative grid gap-8">
      <div
        className="pointer-events-none absolute -right-24 -top-20 size-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#0b1c30] text-white shadow-[0_28px_70px_-34px_rgb(11_28_48/0.65)] animate-[studio-rise_0.55s_ease-out_both]">
        {hasThumb ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary YouTube CDN hosts */}
            <img
              src={project.thumbnail_url!}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-45"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(115deg,rgb(11_28_48/0.92)_12%,rgb(11_28_48/0.55)_48%,rgb(33_112_228/0.35)_100%)]"
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#2170e4_0%,transparent_45%),linear-gradient(145deg,#0b1c30_0%,#16345f_55%,#4648d4_120%)]"
            aria-hidden="true"
          />
        )}

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(14rem,0.85fr)] lg:items-end lg:gap-10 lg:p-10">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <ProjectStatusBadge
                status={project.status}
                className="bg-white/95 text-foreground shadow-sm"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                {isUpload ? (
                  <FileAudio2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <CirclePlay className="size-3.5" aria-hidden="true" />
                )}
                {isUpload ? "Audio upload" : "YouTube"}
              </span>
            </div>

            <h2 className="max-w-3xl text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">
              {title}
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/75">
              {duration !== "—" ? (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {duration}
                </span>
              ) : null}
              <time dateTime={project.updated_at} title={absolute}>
                Updated {relative || absolute}
              </time>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <TextLink
                href="/dashboard"
                className="inline-flex h-10 items-center rounded-lg bg-white/10 px-4 text-[14px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/16 hover:text-white"
              >
                All projects
              </TextLink>
              {!isUpload ? (
                <a
                  href={project.source_ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-primary-fixed"
                >
                  Open source
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/15 backdrop-blur-md">
            {hasThumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary YouTube CDN hosts
              <img
                src={project.thumbnail_url!}
                alt=""
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6">
                <FileAudio2 className="size-10 text-white/85" aria-hidden="true" />
                <Waveform bars={28} className="h-10 w-full max-w-xs text-white/70" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 animate-[studio-rise_0.6s_ease-out_both]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
              Production pipeline
            </h3>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {failed
                ? "This project failed during processing. Retry lands in a later update."
                : `Currently: ${statusLabel}`}
            </p>
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-7">
          {PIPELINE.map((item, index) => {
            const done = !failed && step >= 0 && index <= step;
            const current = !failed && index === step;
            return (
              <li
                key={item.key}
                className={cn(
                  "relative rounded-2xl px-3 py-3 ring-1 transition-colors",
                  done
                    ? "bg-primary-fixed/70 ring-primary/15"
                    : "bg-card ring-[#0b1c30]/6",
                  current && "ring-2 ring-primary shadow-[0_10px_24px_-14px_rgb(0_88_190/0.55)]",
                  failed && "opacity-55",
                )}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-[13px] font-semibold",
                    current ? "text-primary" : "text-foreground",
                  )}
                >
                  {item.label}
                </span>
                {current ? (
                  <Loader2
                    className="absolute right-2.5 top-2.5 size-3.5 animate-spin text-primary"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-[1.5rem] bg-[linear-gradient(135deg,#eff4ff_0%,#ffffff_55%)] px-5 py-5 ring-1 ring-primary/10 sm:px-6 animate-[studio-rise_0.65s_ease-out_both]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">
              {failed ? "Processing stopped" : "Transcription is queued"}
            </p>
            <p className="text-body-sm text-muted-foreground">
              Live progress arrives in a later update (TRANS-03). Your workspace is ready for the
              next review steps.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
