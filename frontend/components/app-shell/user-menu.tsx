"use client";

import { Menu } from "@base-ui/react/menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/lib/auth-actions";
import { initialsFromEmail } from "@/lib/initials";

const itemClass =
  "flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm text-foreground outline-none select-none data-[highlighted]:bg-surface-container-low";

/** Avatar button in the app header with Account and Log out. */
export function UserMenu({ email }: { email: string | null }) {
  const initials = initialsFromEmail(email);

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="flex size-10 items-center justify-center rounded-full outline-none transition-shadow hover:ring-4 hover:ring-primary-fixed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[popup-open]:ring-4 data-[popup-open]:ring-primary-fixed"
      >
        <span
          className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-primary to-brand-indigo text-label-sm text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="w-64 origin-(--transform-origin) rounded-xl border border-border/70 bg-card p-1.5 shadow-card-hover outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md text-on-primary-fixed"
                aria-hidden="true"
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-label-sm text-muted-foreground">Signed in as</p>
                <p className="truncate text-body-sm font-medium text-foreground">{email ?? "Unknown user"}</p>
              </div>
            </div>
            <Menu.Separator className="my-1 h-px bg-border/70" />
            <Menu.LinkItem render={<Link href="/account" />} className={itemClass}>
              <User className="size-4 text-outline" aria-hidden="true" />
              Account
            </Menu.LinkItem>
            <Menu.Item
              onClick={() => void signOut()}
              className={`${itemClass} text-destructive data-[highlighted]:bg-error-container data-[highlighted]:text-on-error-container`}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
