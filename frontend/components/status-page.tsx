"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "danger";

/**
 * Modern minimal status layout for 404 / error boundaries (LEGAL-04).
 * Moves keyboard focus to the heading when mounted for screen-reader users.
 */
export function StatusPage({
  title,
  description,
  actions,
  illustration,
  display,
  reference,
  contactEmail,
  tone = "neutral",
  className,
}: {
  title: string;
  description: ReactNode;
  actions: ReactNode;
  illustration?: ReactNode;
  /** Large display treatment (e.g. "404") shown above the illustration. */
  display?: string;
  /** Shown as "Reference: …" — never pass error.message or a stack. */
  reference?: string;
  contactEmail?: string;
  /** `danger` uses a red-tinted atmosphere for unexpected errors. */
  tone?: StatusTone;
  className?: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isDanger = tone === "danger";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        "relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10 sm:py-16",
        isDanger
          ? "bg-[radial-gradient(100%_70%_at_50%_-5%,color-mix(in_oklch,var(--destructive)_22%,transparent),transparent_55%),linear-gradient(180deg,#fff5f4,#ffe8e6)]"
          : "bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%),linear-gradient(180deg,var(--background),var(--secondary))]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full blur-3xl",
          isDanger ? "bg-destructive/20" : "bg-primary/10",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-16 bottom-8 size-80 rounded-full blur-3xl",
          isDanger ? "bg-destructive/14" : "bg-brand-indigo/10",
        )}
      />

      <div className="relative w-full max-w-2xl animate-[status-rise_0.55s_ease-out_both] text-center">
        <Link
          href="/"
          className="mx-auto mb-6 inline-flex w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mb-8"
        >
          <BrandLogo size="lg" tone={isDanger ? "danger" : "default"} />
        </Link>

        {display ? (
          <p
            aria-hidden="true"
            className={cn(
              "mb-1 bg-clip-text text-[clamp(4.75rem,18vw,7rem)] leading-none font-bold tracking-[-0.06em] text-transparent select-none",
              isDanger
                ? "bg-linear-to-br from-destructive to-[#93000a]"
                : "bg-linear-to-br from-primary to-brand-indigo",
            )}
          >
            {display}
          </p>
        ) : null}

        {illustration ? (
          <div
            className={cn(
              "mx-auto mb-6 w-full max-w-[17.5rem] text-foreground sm:max-w-xs",
              display ? "-mt-3" : "mt-1",
            )}
          >
            {illustration}
          </div>
        ) : null}

        <div className="mx-auto grid w-full gap-3">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-h1-mobile tracking-tight text-foreground outline-none sm:text-h1"
          >
            {title}
          </h1>
          {/* Wide enough on desktop that short status copy stays on 1–2 lines. */}
          <p className="mx-auto max-w-xl text-body-md leading-relaxed text-muted-foreground sm:max-w-2xl sm:text-body-lg sm:leading-relaxed">
            {description}
          </p>
        </div>

        <div className="mx-auto mt-7 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
          {actions}
        </div>

        {reference || contactEmail ? (
          <div className="mx-auto mt-8 grid max-w-xl gap-2 border-t border-border/60 pt-5 text-body-sm text-muted-foreground">
            {contactEmail ? (
              <p>
                {/* Revise once Sentry is wired (OBS-01): then we can say the team was notified. */}
                If this keeps happening, contact{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className={cn(
                    "rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isDanger
                      ? "text-destructive hover:text-[#93000a]"
                      : "text-primary hover:text-primary-container",
                  )}
                >
                  {contactEmail}
                </a>{" "}
                and include the reference below.
              </p>
            ) : null}
            {reference ? (
              <p className="font-mono text-label-sm text-on-surface-variant">
                Reference: {reference}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
