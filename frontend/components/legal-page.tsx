import { FileText } from "lucide-react";

import { APP_NAME } from "@/lib/brand";

/** Shared body for Terms / Privacy until the real documents land (LEGAL tasks). */
export function LegalPage({ title }: { title: string }) {
  return (
    <div className="max-w-3xl">
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
