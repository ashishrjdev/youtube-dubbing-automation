"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowLeft, CircleHelp, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SHELL_CONTAINER, SHELL_HEADER_HEIGHT } from "@/components/app-shell/shell-container";
import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { UserMenu } from "@/components/app-shell/user-menu";
import { useOpenHowItWorks } from "@/components/how-it-works-dialog";
import { pageHeading } from "@/lib/page-headings";
import { cn } from "@/lib/utils";

const iconButton =
  "flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-surface-container-low hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** Sticky top bar: page title (and back link), help, and user menu; plus the nav drawer below lg. */
export function AppHeader({ email, fullName }: { email: string | null; fullName: string | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const heading = pageHeading(usePathname());
  const openHowItWorks = useOpenHowItWorks();

  return (
    <header
      className={cn(
        SHELL_HEADER_HEIGHT,
        "sticky top-0 z-40 shrink-0 border-b border-border/70 bg-card/85 backdrop-blur-md",
      )}
    >
      <div className={cn(SHELL_CONTAINER, "flex h-full items-center gap-3")}>
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          {/* -ml-2.5 lines the glyph, not the 40px hit area, up with the content edge. */}
          <Dialog.Trigger className={cn(iconButton, "-ml-2.5 lg:hidden")} aria-label="Open menu">
            <Menu className="size-5" aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] bg-sidebar shadow-2xl outline-none transition-transform duration-200 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Close className={cn(iconButton, "absolute top-3 right-3")} aria-label="Close menu">
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {heading?.back ? (
          <Link
            href={heading.back.href}
            aria-label={heading.back.label}
            title={heading.back.label}
            className={cn(iconButton, "lg:-ml-2.5")}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {heading ? (
            <>
              <h1 className="truncate font-heading text-body-lg font-bold tracking-tight text-foreground lg:text-[20px] lg:leading-7">
                {heading.title}
              </h1>
              {heading.description ? (
                <p className="mt-0.5 hidden truncate text-label-sm font-normal text-muted-foreground lg:block">
                  {heading.description}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger onClick={openHowItWorks} aria-label="How it works" className={iconButton}>
              <CircleHelp className="size-5" aria-hidden="true" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={6} className="z-50">
                <Tooltip.Popup className="rounded-md bg-on-surface px-2.5 py-1.5 text-label-sm text-white shadow-card-hover transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                  How it works
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
          <UserMenu email={email} fullName={fullName} />
        </div>
      </div>
    </header>
  );
}
