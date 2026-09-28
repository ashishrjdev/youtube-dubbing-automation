import { createServerSupabaseClient } from "@/lib/supabase";

const API_URL = (process.env.API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

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
  const url = new URL(`${API_URL}/${path.replace(/^\/+/, "")}`);
  if (url.origin !== new URL(API_URL).origin) {
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
