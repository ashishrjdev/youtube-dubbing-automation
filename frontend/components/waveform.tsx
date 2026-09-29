import { cn } from "@/lib/utils";

// Deterministic heights (no Math.random) so server and client render the same.
function barHeights(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.abs(Math.sin(i * 0.55) * 0.6 + Math.sin(i * 1.7) * 0.4);
    return Math.round(18 + wave * 82);
  });
}

/** Decorative audio waveform. */
export function Waveform({
  bars = 48,
  className,
  barClassName,
}: {
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("flex h-16 items-center gap-[3px]", className)} aria-hidden="true">
      {barHeights(bars).map((height, i) => (
        <span
          key={i}
          className={cn("w-1 flex-1 rounded-full bg-current", barClassName)}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
