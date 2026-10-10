import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth-validation";
import { createProxySupabaseClient } from "@/lib/supabase";

/** Pages anyone can open. Everything else needs a session. */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/terms",
  "/privacy",
];
/**
 * Prefixes that handle auth themselves: /auth/confirm runs before a session
 * exists, and /api/backend answers 401 rather than redirecting to an HTML page.
 */
const SELF_AUTHENTICATED_PREFIXES = ["/auth/", "/api/"];
/** Signed-in visitors skip these and go straight into the app. */
const SIGNED_OUT_ONLY = ["/login", "/signup"];

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createProxySupabaseClient(request, () => {
    response = NextResponse.next({ request });
    return response;
  });

  // Refreshes an expired access token using the refresh token and writes the
  // rotated tokens back as httpOnly cookies before the page/route handler runs.
  // getUser() asks Supabase Auth, unlike getClaims(), which only checks the JWT
  // locally and would let a revoked session or deleted user through until the
  // token expires. With no session cookie it returns without a network call.
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  /** `path` is same-origin and may carry its own query string. */
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.nextUrl.origin));
    // Carry over any cookie changes (e.g. a refreshed or cleared session).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { pathname, search, searchParams } = request.nextUrl;

  if (SELF_AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return response;

  if (signedIn) {
    if (pathname === "/") return redirectTo("/dashboard");
    if (matches(pathname, SIGNED_OUT_ONLY)) {
      return redirectTo(safeRedirectPath(searchParams.get("next")));
    }
    return response;
  }

  if (matches(pathname, PUBLIC_PATHS)) return response;
  if (pathname === "/") return redirectTo("/login");
  return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
