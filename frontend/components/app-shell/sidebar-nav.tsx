"use client";

import { LayoutDashboard, LogOut, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/lib/logout";
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
    // Project pages live under the dashboard.
    isActive: (p) => p === "/dashboard" || p.startsWith("/projects/"),
  },
  {
    href: "/account",
    label: "Account",
    icon: User,
    isActive: (p) => p.startsWith("/account"),
  },
];

const navClass = (active: boolean) =>
  cn(
    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-surface-container-low text-primary"
      : "text-muted-foreground hover:bg-surface-container-low/70 hover:text-foreground",
  );

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <p className="px-3 pb-2 text-label-sm tracking-wider text-outline uppercase">Workspace</p>
      {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={navClass(active)}
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

      <div className="mt-auto border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout("local");
          }}
          className={cn(
            navClass(false),
            "text-muted-foreground hover:bg-error-container/60 hover:text-destructive",
          )}
        >
          <LogOut className="size-5 text-outline group-hover:text-destructive" aria-hidden="true" />
          Logout
        </button>
      </div>
    </nav>
  );
}
