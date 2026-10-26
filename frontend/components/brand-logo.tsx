import { AudioLines } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoSize = "md" | "lg";
type LogoTone = "default" | "danger";

const MARK_SIZE: Record<LogoSize, { box: string; icon: string }> = {
  md: { box: "size-9 rounded-xl", icon: "size-5" },
  lg: { box: "size-12 rounded-2xl", icon: "size-6" },
};

export function BrandMark({
  size = "md",
  tone = "default",
  className,
}: {
  size?: LogoSize;
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-white shadow-sm",
        tone === "danger"
          ? "bg-linear-to-br from-destructive to-[#93000a] shadow-destructive/25"
          : "bg-linear-to-br from-primary to-brand-indigo shadow-primary/30",
        MARK_SIZE[size].box,
        className,
      )}
      aria-hidden="true"
    >
      <AudioLines className={MARK_SIZE[size].icon} strokeWidth={2.25} />
    </span>
  );
}

export function BrandLogo({
  tagline = false,
  inverted = false,
  tone = "default",
  size = "md",
  className,
}: {
  tagline?: boolean;
  inverted?: boolean;
  tone?: LogoTone;
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center", size === "lg" ? "gap-3" : "gap-2.5", className)}>
      <BrandMark
        size={size}
        tone={tone}
        className={inverted ? "bg-none bg-white/15 shadow-none ring-1 ring-white/25" : undefined}
      />
      <span className="grid leading-tight">
        <span
          className={cn(
            "font-bold tracking-tight",
            size === "lg" ? "text-2xl" : "text-lg",
            inverted ? "text-white" : tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {APP_NAME}
        </span>
        {tagline ? (
          <span
            className={cn(
              "text-label-sm font-medium",
              inverted
                ? "text-white/70"
                : tone === "danger"
                  ? "text-destructive/70"
                  : "text-muted-foreground",
            )}
          >
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
