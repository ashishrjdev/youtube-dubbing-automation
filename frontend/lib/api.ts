"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Browser-side API client for Client Components. Calls go to the same-origin
 * /api/backend proxy, which attaches the httpOnly session token and retries
 * once after a silent token refresh. A 401 that still comes back means the
 * session is gone, so the user is sent to /login.
 */
export function useApiFetch() {
  const router = useRouter();

  return useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
        ...init,
        credentials: "same-origin",
      });

      if (response.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
      }

      return response;
    },
    [router],
  );
}
