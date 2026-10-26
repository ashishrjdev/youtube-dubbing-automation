import { cn } from "@/lib/utils";

/**
 * Decorative SVGs for status pages (LEGAL-04). Decorative only — pair with
 * a real text heading for accessibility.
 */
export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      aria-hidden="true"
    >
      <ellipse cx="160" cy="152" rx="108" ry="14" fill="currentColor" className="text-primary/8" />

      <path
        d="M40 108 C62 78, 84 138, 106 108 S148 78, 168 104"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-primary/40"
      />
      <path
        d="M176 104 C188 92, 198 118, 210 108"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="5 9"
        className="text-primary/28"
      />

      <g className="origin-center animate-[status-float_4.5s_ease-in-out_infinite]">
        <path
          d="M248 64c0-16.016-12.984-29-29-29s-29 12.984-29 29c0 20.3 29 49 29 49s29-28.7 29-49Z"
          fill="currentColor"
          className="text-primary-fixed"
        />
        <path
          d="M248 64c0-16.016-12.984-29-29-29s-29 12.984-29 29c0 20.3 29 49 29 49s29-28.7 29-49Z"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/25"
        />
        <circle cx="219" cy="62" r="10" fill="currentColor" className="text-primary" />
        <path
          d="M214 62h10M219 57v10"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
      </g>

      <circle cx="58" cy="64" r="3.5" fill="currentColor" className="text-brand-indigo/40" />
      <circle cx="292" cy="120" r="2.5" fill="currentColor" className="text-primary/30" />
    </svg>
  );
}

export function ErrorIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      aria-hidden="true"
    >
      <ellipse cx="160" cy="154" rx="100" ry="13" fill="currentColor" className="text-destructive/12" />

      {/* Broken waveform in red tones */}
      <path
        d="M32 100 C52 72, 72 128, 92 100 S132 72, 148 96"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-destructive/35"
      />
      <path
        d="M176 96 C192 120, 212 72, 232 100 S272 128, 292 100"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-destructive/35"
      />

      <g className="origin-center animate-[status-float_4s_ease-in-out_infinite]">
        <circle cx="162" cy="78" r="32" fill="currentColor" className="text-error-container" />
        <circle cx="162" cy="78" r="32" stroke="currentColor" strokeWidth="2.5" className="text-destructive/40" />
        <path
          d="M162 60v22"
          stroke="currentColor"
          strokeWidth="3.75"
          strokeLinecap="round"
          className="text-destructive"
        />
        <circle cx="162" cy="94" r="3" fill="currentColor" className="text-destructive" />
      </g>

      <path
        d="M118 48l6-10M206 48l-6-10M108 82h-12M216 82h12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-destructive/45"
      />
    </svg>
  );
}
