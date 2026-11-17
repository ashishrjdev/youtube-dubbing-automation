/** Full project from create/get (includes source_ref for the workspace). */
export type Project = {
  id: string;
  user_id: string;
  source_type: string;
  source_ref: string;
  title: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/** Dashboard list item — never includes user_id or source_ref (PROJ-03). */
export type ProjectListItem = {
  id: string;
  title: string | null;
  source_type: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  items: ProjectListItem[];
  total: number;
};

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0 || !Number.isFinite(totalSeconds)) {
    return "—";
  }
  const seconds = Math.floor(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
