import { Plus, RefreshCw, Sparkles } from "lucide-react";

import { ErrorIllustration } from "@/components/status-illustrations";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Waveform } from "@/components/waveform";
import { PROJECT_LIST_EMPTY, PROJECT_LIST_ERROR } from "@/lib/project-list-ui";

export function ProjectListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role={PROJECT_LIST_ERROR.role}
      className="relative overflow-hidden rounded-[1.75rem] border border-destructive/15 bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_55%)] px-6 py-12 text-center shadow-[0_20px_50px_-28px_rgb(186_26_26/0.35)] sm:px-10"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-destructive/8 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-md animate-[studio-rise_0.5s_ease-out_both]">
        <ErrorIllustration className="mx-auto mb-6 max-w-[240px] text-destructive" />
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
          Couldn’t load your projects
        </h2>
        <p className="mt-2 text-body-md text-muted-foreground">{PROJECT_LIST_ERROR.message}</p>
        <div className="mt-7">
          <Button type="button" size="lg" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {PROJECT_LIST_ERROR.retryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProjectListEmpty({ extraAction }: { extraAction?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-[radial-gradient(ellipse_at_top,#d8e2ff_0%,transparent_55%),linear-gradient(180deg,#f8f9ff_0%,#ffffff_60%)] px-6 py-14 text-center shadow-[0_24px_60px_-32px_rgb(0_88_190/0.35)] sm:px-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-10 top-16 size-40 rounded-full bg-brand-indigo/15 blur-3xl animate-[studio-glow_5s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-10 size-44 rounded-full bg-primary/15 blur-3xl animate-[studio-glow_6s_ease-in-out_infinite]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-lg animate-[studio-rise_0.55s_ease-out_both]">
        <div className="mx-auto mb-7 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-button">
          <Sparkles className="size-7" aria-hidden="true" />
        </div>
        <Waveform
          bars={36}
          className="mx-auto mb-8 h-12 max-w-sm text-primary/45"
          barClassName="bg-current opacity-80"
        />
        <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-foreground sm:text-[28px]">
          {PROJECT_LIST_EMPTY.title}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body-md text-muted-foreground">
          {PROJECT_LIST_EMPTY.description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={PROJECT_LIST_EMPTY.ctaHref} size="lg">
            <Plus className="size-4" aria-hidden="true" />
            {PROJECT_LIST_EMPTY.ctaLabel}
          </ButtonLink>
          {extraAction}
        </div>
      </div>
    </div>
  );
}
