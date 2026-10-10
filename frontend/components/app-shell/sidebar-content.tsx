import { Sparkles } from "lucide-react";
import Link from "next/link";

import { SHELL_HEADER_HEIGHT } from "@/components/app-shell/shell-container";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn(SHELL_HEADER_HEIGHT, "flex shrink-0 items-center border-b border-border/70 px-6")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo tagline />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-linear-to-br from-surface-container-low to-surface-container px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-card">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 truncate text-label-md text-foreground">{APP_NAME}</p>
          <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
}
