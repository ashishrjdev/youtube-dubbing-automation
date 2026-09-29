"use client";

import { CircleHelp, LayoutDashboard, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOpenHowItWorks } from "@/components/how-it-works-dialog";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    // Project pages live under the dashboard; /projects/new has its own CTA.
    isActive: (p) => p === "/dashboard" || (p.startsWith("/projects/") && p !== "/projects/new"),
  },
  {
    href: "/account",
    label: "Account",
    icon: User,
    isActive: (p) => p.startsWith("/account"),
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const openHowItWorks = useOpenHowItWorks();

  return (
    <nav aria-label="Main" className="grid gap-1">
      <p className="px-3 pb-2 text-label-sm tracking-wider text-outline uppercase">Workspace</p>
      {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-surface-container-low text-primary"
                : "text-muted-foreground hover:bg-surface-container-low/70 hover:text-foreground",
            )}
          >
            {active ? (
              <span
                className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
            <Icon
              className={cn(
                "size-5 transition-colors",
                active ? "text-primary" : "text-outline group-hover:text-foreground",
              )}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}

      <p className="px-3 pt-5 pb-2 text-label-sm tracking-wider text-outline uppercase">Help</p>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openHowItWorks();
        }}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-label-md text-primary transition-colors outline-none hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp className="size-5" aria-hidden="true" />
        How it works
      </button>
    </nav>
  );
}
