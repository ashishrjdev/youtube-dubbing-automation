import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS } from "@/components/workflow-steps";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;

  return (
    <div className="grid gap-8">
      <PageHeader
        back={{ href: "/dashboard", label: "Back to projects" }}
        title="Project"
        description={
          <span className="font-mono text-body-sm break-all">{id}</span>
        }
        actions={<Badge variant="secondary">Details coming soon</Badge>}
      />

      <section
        aria-labelledby="pipeline"
        className="rounded-2xl border border-border/70 bg-card p-6 shadow-card sm:p-8"
      >
        <h2 id="pipeline" className="text-body-lg font-semibold text-foreground">
          Pipeline
        </h2>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Progress for each stage will show here as your project moves through it.
        </p>

        <ol className="mt-6 grid gap-0">
          {WORKFLOW_STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="relative flex gap-4 pb-8 last:pb-0">
              {index < WORKFLOW_STEPS.length - 1 ? (
                <span
                  className="absolute top-11 bottom-1 left-5 w-px bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-container-low text-outline">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="grid gap-0.5 pt-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body-md font-semibold text-foreground">{title}</h3>
                  <Badge variant="outline">Not started</Badge>
                </div>
                <p className="text-body-sm text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
