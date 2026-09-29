import { Check, Languages } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { Waveform } from "@/components/waveform";

const FEATURES = [
  "Accurate transcription with speaker detection",
  "AI script rewriting that keeps timing natural",
  "Studio-quality voices for every character",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="relative hidden w-[44%] max-w-[640px] shrink-0 flex-col justify-between overflow-hidden bg-linear-to-br from-primary via-primary-container to-brand-indigo p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-brand-indigo/40 blur-3xl"
          aria-hidden="true"
        />

        <Link href="/" className="relative w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white">
          <BrandLogo inverted tagline />
        </Link>

        <div className="relative grid gap-8">
          <div className="grid gap-4">
            <h2 className="text-h1 text-balance text-white">Dub any video into any language.</h2>
            <p className="max-w-md text-body-lg text-white/80">
              From transcript to finished voice track in one focused workspace.
            </p>
          </div>
          <ul className="grid gap-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-body-md text-white/90">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Illustration only. */}
        <div
          className="relative rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md"
          aria-hidden="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-label-md text-white">
              <Languages className="size-4" />
              English → Spanish
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-label-sm text-white">
              Generating voice
            </span>
          </div>
          <Waveform bars={56} className="h-14 text-white/70" />
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-fixed/60 to-transparent lg:hidden"
          aria-hidden="true"
        />
        <div className="relative w-full max-w-[440px]">
          <Link
            href="/"
            className="mx-auto mb-8 flex w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <BrandLogo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
