import { ArrowLeft } from "lucide-react";

import { TextLink } from "@/components/text-link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="grid min-w-0 gap-1.5">
        {back ? (
          <TextLink href={back.href} variant="subtle" className="mb-1 w-fit text-body-sm">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {back.label}
          </TextLink>
        ) : null}
        <h1 className="text-h3 text-foreground sm:text-h2">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-body-md text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
