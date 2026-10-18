import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase";

const DEV_API_URL = "http://localhost:8000";

function apiUrl(): string {
  const configured = process.env.API_URL?.trim().replace(/\/+$/, "");
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new Error("API_URL is not set");
    return DEV_API_URL;
  }
  if (process.env.VERCEL_ENV === "production" && !configured.startsWith("https://")) {
    throw new Error("API_URL must use https:// in production");
  }
  return configured;
}

function unauthorized(): Response {
  return Response.json({ detail: "Not authenticated" }, { status: 401 });
}

type RefreshResult = { accessToken: string } | null;

// Shared across concurrent /api/backend requests in this Node process so
// refresh-token rotation is not tripped by parallel 401 retries.
const refreshState: { current: Promise<RefreshResult> | null } = { current: null };

/**
 * One shared refresh for every concurrent caller. With refresh-token rotation,
 * two refreshSession() calls using the same token look like theft and can
 * revoke the whole session family.
 */
export async function refreshAccessTokenSingleFlight(
  supabase: SupabaseClient,
): Promise<RefreshResult> {
  if (!refreshState.current) {
    refreshState.current = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) return null;
        return { accessToken: data.session.access_token };
      } finally {
        refreshState.current = null;
      }
    })();
  }
  return refreshState.current;
}

/**
 * Server-only fetch to the FastAPI backend with the user's access token.
 *
 * Use from Server Components, Server Actions, and the /api/backend proxy.
 * On a 401 it refreshes the Supabase session once (deduped) and retries; if
 * that fails the 401 is returned so the caller can send the user to /login.
 * Non-401 errors (400, 403, 422, 500, …) are returned as-is and never refresh.
 */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = apiUrl();
  const url = new URL(`${base}/${path.replace(/^\/+/, "")}`);
  if (url.origin !== new URL(base).origin) {
    throw new Error(`Refusing to send credentials to ${url.origin}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return unauthorized();

  const send = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers, cache: "no-store" });
  };

  const response = await send(session.access_token);
  if (response.status !== 401) return response;

  const refreshed = await refreshAccessTokenSingleFlight(supabase);
  if (!refreshed) return response;
  return send(refreshed.accessToken);
}
