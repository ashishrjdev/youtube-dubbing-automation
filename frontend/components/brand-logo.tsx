import { AudioLines } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-brand-indigo text-white shadow-sm shadow-primary/30",
        className,
      )}
      aria-hidden="true"
    >
      <AudioLines className="size-5" strokeWidth={2.25} />
    </span>
  );
}

export function BrandLogo({
  tagline = false,
  inverted = false,
  className,
}: {
  tagline?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={inverted ? "bg-none bg-white/15 shadow-none ring-1 ring-white/25" : undefined} />
      <span className="grid leading-tight">
        <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-foreground")}>
          {APP_NAME}
        </span>
        {tagline ? (
          <span className={cn("text-label-sm font-medium", inverted ? "text-white/70" : "text-muted-foreground")}>
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
