import { SHELL_CONTAINER } from "@/components/app-shell/shell-container";
import { TextLink } from "@/components/text-link";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function AppFooter() {
  return (
    <footer className="border-t border-border/70">
      <div
        className={cn(
          SHELL_CONTAINER,
          "flex flex-col-reverse items-center gap-1.5 py-3 text-label-sm font-normal text-muted-foreground sm:flex-row sm:justify-between",
        )}
      >
        <p>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <TextLink href="/terms" variant="subtle">
            Terms of Service
          </TextLink>
          <TextLink href="/privacy" variant="subtle">
            Privacy Policy
          </TextLink>
        </nav>
      </div>
    </footer>
  );
}
