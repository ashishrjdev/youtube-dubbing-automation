"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AUTH_SYNC_CHANNEL,
  AUTH_SYNC_STORAGE_KEY,
  clearForceLogoutFlag,
  hasForceLogoutFlag,
  type AuthSyncMessage,
} from "@/lib/auth-sync";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/account"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Multi-tab logout + bfcache guard.
 *
 * Sessions live in httpOnly cookies, so a browser Supabase client cannot see
 * SIGNED_OUT via onAuthStateChange. Other tabs are notified through
 * BroadcastChannel / localStorage instead (same event name: SIGNED_OUT).
 */
export function AuthSessionSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const goLogin = () => {
      if (pathname === "/login" || pathname.startsWith("/login?")) return;
      window.location.replace("/login");
    };

    const onMessage = (data: unknown) => {
      const message = data as AuthSyncMessage | null;
      if (message?.event === "SIGNED_OUT") goLogin();
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.onmessage = (event) => onMessage(event.data);
    } catch {
      // unsupported
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;
      try {
        onMessage(JSON.parse(event.newValue));
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);

    // Offline logout sets a flag. Finish revoking httpOnly cookies when we can.
    const finishForcedLogout = () => {
      if (!hasForceLogoutFlag()) return;
      if (pathname.startsWith("/auth/logout")) return;

      if (isProtected(pathname)) {
        clearForceLogoutFlag();
        window.location.replace("/auth/logout");
        return;
      }

      if (pathname === "/login") {
        clearForceLogoutFlag();
        void fetch("/auth/logout", { credentials: "same-origin", redirect: "manual" }).catch(
          () => undefined,
        );
      }
    };
    finishForcedLogout();
    window.addEventListener("online", finishForcedLogout);

    // Re-check the session when a protected page is shown again (bfcache,
    // tab focus). Covers the case where cookies were cleared in another tab
    // and BroadcastChannel wasn't delivered.
    const ensureStillSignedIn = () => {
      if (!isProtected(pathname)) return;
      void fetch("/api/backend/me", { cache: "no-store", credentials: "same-origin" }).then(
        (response) => {
          if (response.status === 401) {
            router.replace("/login");
            window.location.replace("/login");
          }
        },
      );
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) ensureStillSignedIn();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") ensureStillSignedIn();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", ensureStillSignedIn);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", finishForcedLogout);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", ensureStillSignedIn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, router]);

  return null;
}
