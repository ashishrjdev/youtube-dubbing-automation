"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/logout";

/** Account-page control: ends every session for this user. */
export function LogoutEverywhereButton() {
  return (
    <Button type="button" variant="outline" size="lg" onClick={() => logout("global")}>
      <LogOut className="size-4" aria-hidden="true" />
      Log out of all devices
    </Button>
  );
}
