"use client";

import { broadcastSignedOut, hasForceLogoutFlag } from "@/lib/auth-sync";

/**
 * Ends the current browser session and sends the user to /login.
 *
 * Uses a full navigation to /auth/logout so httpOnly cookies are cleared by the
 * server even when a Server Action fetch would fail, and so the browser drops
 * any cached protected page. Broadcasts SIGNED_OUT so other tabs follow.
 *
 * If the navigation cannot run (DevTools offline), fall back to /login after a
 * short wait; AuthSessionSync finishes the server revoke when the network returns.
 */
export function logout(scope: "local" | "global" = "local") {
  broadcastSignedOut();
  const url = scope === "global" ? "/auth/logout?scope=global" : "/auth/logout";
  window.location.assign(url);
  window.setTimeout(() => {
    if (hasForceLogoutFlag() && !window.location.pathname.startsWith("/auth/logout")) {
      window.location.replace("/login");
    }
  }, 1500);
}
