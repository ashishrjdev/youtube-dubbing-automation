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

/**
 * Server-only fetch to the FastAPI backend with the user's access token.
 *
 * Use from Server Components, Server Actions, and the /api/backend proxy.
 * On a 401 it refreshes the Supabase session once and retries; if that fails
 * the 401 is returned so the caller can send the user to /login.
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

  const { data: refreshed } = await supabase.auth.refreshSession();
  if (!refreshed.session) return response;
  return send(refreshed.session.access_token);
}
