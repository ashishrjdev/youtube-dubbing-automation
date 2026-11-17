/** Copy + structure for dashboard empty/error states (PROJ-03). */

export const PROJECT_LIST_ERROR = {
  role: "alert" as const,
  message: "Something went wrong loading your projects. Please try again.",
  retryLabel: "Try again",
};

export const PROJECT_LIST_EMPTY = {
  title: "No projects yet — create your first one",
  description:
    "Start with a YouTube link or an audio file. We'll transcribe it, help you polish the script, and generate the dubbed voice track.",
  ctaLabel: "New Project",
  ctaHref: "/projects/new",
};

/** Which list surface to show given load state and totals. */
export function projectListView(
  state: "loading" | "ready" | "error",
  total: number,
): "loading" | "error" | "empty" | "list" {
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  if (total === 0) return "empty";
  return "list";
}
