"use client";

import { useCallback } from "react";

import { logout } from "@/lib/logout";

export { BACKEND_SERVER_ERROR_MESSAGE, messageForBackendFailure } from "@/lib/backend-errors";

/**
 * Browser-side API client for Client Components. Calls go to the same-origin
 * `/api/backend` proxy, which attaches the httpOnly access token, silently
 * refreshes once on 401 (deduped across parallel calls), and retries.
 *
 * A 401 that still comes back means the session is gone: clear cookies and go
 * to `/login`. Non-401 errors are returned untouched and never trigger refresh
 * or logout.
 *
 * On 5xx, use `messageForBackendFailure(response)` for the friendly inline /
 * toast copy ("Something went wrong, please try again") and **never** print or
 * parse the response body — it must not reach the UI (LEGAL-04).
 */
export function useApiFetch() {
  return useCallback(async (path: string, init: RequestInit = {}): Promise<Response> => {
    const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
      ...init,
      credentials: "same-origin",
    });

    if (response.status === 401) {
      // Terminal auth failure after the proxy already tried one refresh.
      logout("local");
    }

    // Intentionally do not read response.text()/json() here — especially on 5xx.
    return response;
  }, []);
}
