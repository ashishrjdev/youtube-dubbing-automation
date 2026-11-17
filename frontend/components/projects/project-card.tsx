"use client";

import { FileAudio2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { formatDuration, type ProjectListItem } from "@/lib/projects";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/relative-time";
import { projectStatusPill } from "@/lib/project-status";
import { cn } from "@/lib/utils";

function AudioPlaceholder({ title }: { title: string }) {
  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#d8e2ff_0%,transparent_55%),linear-gradient(145deg,#0b1c30_0%,#1a3a6b_48%,#2170e4_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-3 px-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-md">
          <FileAudio2 className="size-6 text-white" aria-hidden="true" />
        </div>
        <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-white/80 origin-bottom"
              style={{
                height: `${28 + ((i * 37) % 48)}%`,
                animation: `studio-wave ${1.1 + (i % 5) * 0.12}s ease-in-out ${i * 0.05}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function ProjectThumbnail({
  title,
  thumbnailUrl,
  sourceType,
}: {
  title: string;
  thumbnailUrl: string | null;
  sourceType: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(thumbnailUrl) && !failed && sourceType !== "upload";

  if (!showImage) {
    return <AudioPlaceholder title={title} />;
  }

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container-low">
      <Image
        src={thumbnailUrl!}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1c30]/72 via-[#0b1c30]/10 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

export function ProjectCard({
  project,
  index = 0,
}: {
  project: ProjectListItem;
  index?: number;
}) {
  const title = project.title?.trim() || "Untitled project";
  const statusLabel = projectStatusPill(project.status).label;
  const absolute = formatAbsoluteTime(project.updated_at);
  const relative = formatRelativeTime(project.updated_at);
  const duration = formatDuration(project.duration_seconds);

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${title}, ${statusLabel}`}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.35rem]",
        "bg-card shadow-[0_1px_2px_rgb(11_28_48/0.04),0_12px_28px_-14px_rgb(11_28_48/0.28)]",
        "ring-1 ring-[#0b1c30]/6 outline-none",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgb(0_88_190/0.35)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "animate-[studio-rise_0.55s_ease-out_both]",
      )}
    >
      <div className="relative">
        <ProjectThumbnail
          title={title}
          thumbnailUrl={project.thumbnail_url}
          sourceType={project.source_type}
        />
        {duration !== "—" ? (
          <span className="absolute bottom-3 right-3 z-10 rounded-md bg-[#0b1c30]/72 px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
            {duration}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary">
          {title}
        </h2>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
        </div>
        <time
          dateTime={project.updated_at}
          title={absolute}
          className="text-[12px] font-medium text-muted-foreground"
        >
          Updated {relative || absolute}
        </time>
      </div>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[1.35rem] bg-card ring-1 ring-[#0b1c30]/6"
      aria-hidden="true"
    >
      <div
        className="aspect-[16/10] bg-[linear-gradient(110deg,#e5eeff_25%,#f8f9ff_40%,#e5eeff_55%)] bg-[length:200%_100%] animate-[studio-shimmer_1.4s_linear_infinite]"
      />
      <div className="grid gap-3 p-4">
        <div className="h-5 w-4/5 rounded-md bg-surface-container-high/80" />
        <div className="h-3.5 w-2/5 rounded-md bg-surface-container/90" />
      </div>
    </div>
  );
}
