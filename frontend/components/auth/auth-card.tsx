import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

/**
 * Content block used by every auth / simple setup screen, sitting directly on
 * the white half of the (auth) layout: optional icon badge, title,
 * description, body, and a footer for secondary links.
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
    <div className={cn("flex flex-col gap-6 sm:gap-8", className)}>
      {/* The desktop brand panel shows the logo; below lg it sits here, aligned with the content. */}
      <Link
        href="/"
        className={cn(
          "mb-4 flex w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mb-6 lg:hidden",
          Icon && "self-center",
        )}
      >
        <BrandLogo size="lg" />
      </Link>
      <header className={cn("grid gap-2 sm:gap-3", Icon && "justify-items-center text-center")}>
        {Icon ? (
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary ring-8 ring-primary-fixed/40">
            <Icon className="size-7" strokeWidth={2} aria-hidden="true" />
          </div>
        ) : null}
        <h1 className="text-h1-mobile tracking-tight text-foreground sm:text-h1">{title}</h1>
        {description ? (
          <div className="text-body-md text-muted-foreground sm:text-body-lg">{description}</div>
        ) : null}
      </header>
      {children}
      {footer ? (
        <footer className="border-t border-border/70 pt-6 text-center text-body-sm">{footer}</footer>
      ) : null}
    </div>
  );
}
