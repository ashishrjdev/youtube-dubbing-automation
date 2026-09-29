import { passwordStrength } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

const FILL = ["w-0", "w-1/4", "w-2/4", "w-3/4", "w-full"];
const COLOR = ["", "bg-destructive", "bg-amber-500", "bg-primary-container", "bg-emerald-600"];

export function PasswordStrengthMeter({ password, id }: { password: string; id?: string }) {
  const { score, label } = passwordStrength(password);

  return (
    <div className="mt-2 grid gap-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
        <div className={cn("h-full rounded-full transition-all", FILL[score], COLOR[score])} />
      </div>
      <p id={id} className="min-h-4 text-label-sm text-muted-foreground">
        {label ? `${label} password` : ""}
      </p>
    </div>
  );
}
