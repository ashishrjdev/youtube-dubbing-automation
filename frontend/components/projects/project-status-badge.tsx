import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { projectStatusPill } from "@/lib/project-status";

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const pill = projectStatusPill(status);
  const Icon = pill.icon;
  return (
    <Badge variant={pill.variant} className={cn("gap-1.5", className)}>
      <Icon
        className={cn("size-3.5", pill.spin && "animate-spin")}
        aria-hidden="true"
      />
      {pill.label}
    </Badge>
  );
}
