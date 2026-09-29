import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-12 text-center sm:py-16",
        className,
      )}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <h2 className="text-h3 text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-body-md text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
