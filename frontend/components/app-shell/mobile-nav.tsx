"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { BrandLogo } from "@/components/brand-logo";

const iconButton =
  "flex size-10 items-center justify-center rounded-lg text-foreground transition-colors outline-none hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-ring";

/** Top bar + slide-in drawer, shown below the lg breakpoint. */
export function MobileNav({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md lg:hidden">
      <Link href="/dashboard" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <BrandLogo />
      </Link>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className={iconButton} aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] bg-sidebar shadow-2xl outline-none transition-transform duration-200 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close className={`${iconButton} absolute top-5 right-3`} aria-label="Close menu">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
            <SidebarContent email={email} onNavigate={() => setOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
