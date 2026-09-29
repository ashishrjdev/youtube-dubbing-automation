import { LogOut, Plus } from "lucide-react";
import Link from "next/link";

import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { BrandLogo } from "@/components/brand-logo";
import { ButtonLink } from "@/components/ui/button-link";
import { signOut } from "@/lib/auth-actions";
import { initialsFromEmail } from "@/lib/initials";

/** Shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({
  email,
  onNavigate,
}: {
  email: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="w-fit rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandLogo tagline />
      </Link>

      <ButtonLink href="/projects/new" onClick={onNavigate} size="lg" className="w-full">
        <Plus className="size-4" aria-hidden="true" />
        New project
      </ButtonLink>

      <SidebarNav onNavigate={onNavigate} />

      <div className="mt-auto flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-surface-container-low/60 p-3 shadow-card">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md text-on-primary-fixed"
            aria-hidden="true"
          >
            {initialsFromEmail(email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm text-muted-foreground">Signed in as</p>
            <p className="truncate text-body-sm font-medium text-foreground" title={email ?? undefined}>
              {email ?? "Unknown user"}
            </p>
          </div>
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-error-container hover:text-on-error-container focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
        <div className="flex gap-4 px-2 text-label-sm">
          <Link href="/terms" onClick={onNavigate} className="font-medium text-primary hover:underline">
            Terms
          </Link>
          <Link href="/privacy" onClick={onNavigate} className="font-medium text-primary hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
