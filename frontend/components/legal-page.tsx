import { FileText } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/brand";

/** Shared shell for Terms / Privacy until the real documents land (LEGAL tasks). */
export function LegalPage({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="grid max-w-3xl gap-8">
      <PageHeader title={title} description={summary} />
      <article className="flex gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="grid gap-2">
          <h2 className="text-body-lg font-semibold text-foreground">Being finalized</h2>
          <p className="text-body-md text-muted-foreground">
            We&apos;re finalizing the {title} for {APP_NAME}. The full document will be published
            here before launch.
          </p>
        </div>
      </article>
    </div>
  );
}
