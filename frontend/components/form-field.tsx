import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** ids for an input's aria-describedby: hint (if any) then the error region. */
export function fieldDescribedBy(id: string, { hint = false } = {}): string {
  return [hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(" ");
}

/**
 * Label + control + optional hint + error message.
 * Pair the control with aria-invalid and aria-describedby={fieldDescribedBy(id)}.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <div id={`${id}-hint`} className="mt-1 text-label-sm font-normal text-muted-foreground">
          {hint}
        </div>
      ) : null}
      {/* Always mounted so screen readers announce errors as they appear. */}
      <div id={`${id}-error`} aria-live="polite" className="empty:hidden">
        {error ? <p className="mt-1 text-label-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
