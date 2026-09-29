import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Centered card used by every auth / simple setup screen: optional icon badge,
 * title, description, body, and a footer for secondary links.
 */
export function AuthCard({
  title,
  description,
  icon: Icon,
  footer,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-7 rounded-2xl border-border/70 px-6 py-8 shadow-xl shadow-primary/5 sm:px-8 sm:py-10",
        className,
      )}
    >
      <header className={cn("grid gap-2", Icon && "justify-items-center text-center")}>
        {Icon ? (
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary ring-8 ring-primary-fixed/40">
            <Icon className="size-7" strokeWidth={2} aria-hidden="true" />
          </div>
        ) : null}
        <h1 className="text-h1-mobile text-foreground sm:text-h2">{title}</h1>
        {description ? (
          <div className="text-body-md text-muted-foreground">{description}</div>
        ) : null}
      </header>
      {children}
      {footer ? (
        <footer className="border-t border-border/70 pt-6 text-center text-body-sm">{footer}</footer>
      ) : null}
    </Card>
  );
}
