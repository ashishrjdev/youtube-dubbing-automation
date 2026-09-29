"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  Link2,
  PenLine,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { WORKFLOW_STEPS } from "@/components/workflow-steps";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 50;

/** Step slider: progress segments on top, one slide per step. `onFinish` runs from the last step. */
export function HowItWorks({ onFinish }: { onFinish: () => void }) {
  const count = WORKFLOW_STEPS.length;
  const [active, setActive] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  const go = (index: number) => setActive(Math.min(Math.max(index, 0), count - 1));

  return (
    <div role="region" aria-roledescription="carousel" aria-label="How it works" className="grid gap-5">
      <ol className="flex items-start">
        {WORKFLOW_STEPS.map(({ title }, index) => {
          const isActive = index === active;
          const isComplete = index < active;
          return (
            <li key={title} className="relative flex flex-1 flex-col items-center">
              {index > 0 ? (
                <span
                  className="absolute top-5 right-[calc(50%+1.5rem)] left-[calc(-50%+1.5rem)] h-0.5 overflow-hidden rounded-full bg-outline-variant/60"
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "absolute inset-0 origin-left bg-emerald-500 transition-[scale] duration-300 ease-out motion-reduce:transition-none",
                      index <= active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => go(index)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${title}${isComplete ? " (completed)" : ""}`}
                className="group flex flex-col items-center gap-2 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full border-2 text-label-md transition-colors duration-300",
                    isComplete && "border-emerald-500 bg-emerald-500 text-white",
                    isActive && "border-primary bg-primary-fixed text-primary ring-4 ring-primary/15",
                    !isComplete &&
                      !isActive &&
                      "border-outline-variant bg-card text-muted-foreground group-hover:border-outline group-hover:text-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden max-w-32 text-center text-body-sm font-semibold transition-colors sm:block",
                    isActive && "text-primary",
                    isComplete && "text-emerald-700",
                    !isComplete && !isActive && "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="overflow-hidden">
        <div
          className="touch-pan-y"
          onPointerDown={(event) => {
            swipeStartX.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (swipeStartX.current === null) return;
            const dx = event.clientX - swipeStartX.current;
            swipeStartX.current = null;
            if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(active + (dx < 0 ? 1 : -1));
          }}
        >
          <div
            className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {WORKFLOW_STEPS.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                inert={index !== active}
                className="grid w-full shrink-0 gap-6 py-2 md:grid-cols-2 md:items-center md:gap-8"
              >
                <div className="grid content-start gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-brand-indigo text-white shadow-button">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-label-sm text-primary">
                      Step {index + 1} of {count}
                    </span>
                  </div>
                  <h3 className="text-h3 text-foreground">{title}</h3>
                  <p className="max-w-md text-body-md text-muted-foreground">{description}</p>
                </div>
                <StepIllustration step={index} />
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-5">
        <p className="sr-only" aria-live="polite">
          Step {active + 1} of {count}
        </p>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => go(active - 1)}
          className={cn(active === 0 && "invisible")}
        >
          <ChevronLeft aria-hidden="true" />
          Back
        </Button>
        {active === count - 1 ? (
          <Button size="lg" onClick={onFinish}>
            Get started
          </Button>
        ) : (
          <Button size="lg" onClick={() => go(active + 1)}>
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Placeholder bar standing in for a line of text in the mock UIs. */
function Line({ className }: { className?: string }) {
  return <span className={cn("block h-2 rounded-full bg-outline-variant/70", className)} />;
}

function StepIllustration({ step }: { step: number }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex min-h-56 flex-col justify-center gap-3 overflow-hidden rounded-xl bg-linear-to-br from-surface-container-low to-surface-container p-5 sm:p-6"
    >
      {step === 0 ? <AddVideoMock /> : null}
      {step === 1 ? <TranscribeMock /> : null}
      {step === 2 ? <ReviewMock /> : null}
      {step === 3 ? <GenerateMock /> : null}
    </div>
  );
}

const mockCard = "rounded-lg border border-border/60 bg-card p-3 shadow-card";

function AddVideoMock() {
  return (
    <>
      <div className={cn(mockCard, "flex items-center gap-3")}>
        <Link2 className="size-4 shrink-0 text-primary" />
        <span className="truncate font-mono text-body-sm text-muted-foreground">youtube.com/watch?v=…</span>
        <span className="ml-auto shrink-0 rounded-md bg-linear-to-br from-primary to-brand-indigo px-2.5 py-1 text-label-sm text-white">
          Import
        </span>
      </div>
      <div className="flex items-center gap-3 text-label-sm text-outline">
        <span className="h-px flex-1 bg-outline-variant" />
        or
        <span className="h-px flex-1 bg-outline-variant" />
      </div>
      <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline-variant bg-card/60 py-5 text-body-sm text-muted-foreground">
        <FileAudio className="size-4 text-primary" />
        Drop an audio file
      </div>
    </>
  );
}

const SPEAKERS = [
  { name: "Speaker 1", dot: "bg-primary", widths: ["w-11/12", "w-2/3"] },
  { name: "Speaker 2", dot: "bg-brand-indigo", widths: ["w-4/5"] },
  { name: "Speaker 1", dot: "bg-primary", widths: ["w-full", "w-1/2"] },
];

function TranscribeMock() {
  return SPEAKERS.map(({ name, dot, widths }, i) => (
    <div key={i} className={cn(mockCard, "grid gap-2")}>
      <span className="flex items-center gap-2 text-label-sm text-foreground">
        <span className={cn("size-2 rounded-full", dot)} />
        {name}
      </span>
      {widths.map((width) => (
        <Line key={width} className={width} />
      ))}
    </div>
  ));
}

function ReviewMock() {
  return (
    <>
      <div className={cn(mockCard, "grid gap-2 opacity-70")}>
        <span className="text-label-sm text-muted-foreground">Original</span>
        <Line className="w-full" />
        <Line className="w-3/5" />
      </div>
      <div className={cn(mockCard, "grid gap-2 border-primary/40 ring-3 ring-primary/10")}>
        <span className="flex items-center gap-2 text-label-sm text-primary">
          <PenLine className="size-3.5" />
          Rewritten
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Fits timing</span>
        </span>
        <Line className="w-11/12 bg-primary/30" />
        <Line className="w-2/3 bg-primary/30" />
      </div>
    </>
  );
}

function GenerateMock() {
  return (
    <>
      {[
        { voice: "Voice A", color: "text-primary", dot: "bg-primary" },
        { voice: "Voice B", color: "text-brand-indigo", dot: "bg-brand-indigo" },
      ].map(({ voice, color, dot }) => (
        <div key={voice} className={cn(mockCard, "grid gap-2")}>
          <span className="flex items-center gap-2 text-label-sm text-foreground">
            <span className={cn("size-2 rounded-full", dot)} />
            {voice}
          </span>
          <Waveform bars={36} className={cn("h-8", color)} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-card">
          <span className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-linear-to-r from-primary to-brand-indigo" />
        </span>
        <span className="text-label-sm text-muted-foreground">Generating</span>
      </div>
    </>
  );
}
