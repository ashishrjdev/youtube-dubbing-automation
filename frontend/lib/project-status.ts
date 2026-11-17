/**
 * Shared project status → pill mapping (PROJ-03).
 * Exhaustive for every backend ProjectStatus value; unknown → neutral "Unknown".
 */
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  FilePenLine,
  Loader2,
  Mic2,
  Sparkles,
  Users,
} from "lucide-react";

export const PROJECT_STATUSES = [
  "created",
  "transcribing",
  "name_review",
  "script_review",
  "approved",
  "voice_mapping",
  "audio_generating",
  "completed",
  "failed",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export type ProjectStatusPill = {
  label: string;
  /** Badge color variant — meaning never depends on color alone (icon + text). */
  variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
  icon: LucideIcon;
  /** When true, the icon should spin (in-progress states). */
  spin?: boolean;
};

const STATUS_PILLS: Record<ProjectStatusValue, ProjectStatusPill> = {
  created: { label: "Starting", variant: "secondary", icon: Sparkles },
  transcribing: { label: "Transcribing", variant: "warning", icon: Loader2, spin: true },
  name_review: { label: "Needs name review", variant: "default", icon: Users },
  script_review: { label: "Needs script review", variant: "default", icon: FilePenLine },
  approved: { label: "Needs voice mapping", variant: "default", icon: Mic2 },
  voice_mapping: { label: "Needs voice mapping", variant: "default", icon: Mic2 },
  audio_generating: {
    label: "Generating audio",
    variant: "warning",
    icon: Loader2,
    spin: true,
  },
  completed: { label: "Completed", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: AlertTriangle },
};

const UNKNOWN_PILL: ProjectStatusPill = {
  label: "Unknown",
  variant: "outline",
  icon: CircleHelp,
};

export function isKnownProjectStatus(status: string): status is ProjectStatusValue {
  return (PROJECT_STATUSES as readonly string[]).includes(status);
}

export function projectStatusPill(status: string): ProjectStatusPill {
  if (isKnownProjectStatus(status)) return STATUS_PILLS[status];
  return UNKNOWN_PILL;
}

/** Decorative placeholder when a project has no thumbnail (uploads / broken images). */
export const PROJECT_THUMBNAIL_FALLBACK_ICON = Clapperboard;
