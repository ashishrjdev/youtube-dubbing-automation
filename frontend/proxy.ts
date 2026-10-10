import { NextResponse, type NextRequest } from "next/server";

import { createProxySupabaseClient } from "@/lib/supabase";

/** App areas that need a session; signed-out visitors are sent to /login. */
const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/account"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createProxySupabaseClient(request, () => {
    response = NextResponse.next({ request });
    return response;
  });

  // Refreshes an expired access token using the refresh token and writes the
  // rotated tokens back as httpOnly cookies before the page/route handler runs.
  const { data } = await supabase.auth.getClaims();

  const { pathname, search } = request.nextUrl;
  if (!data?.claims && isProtected(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(login);
    // Carry over any cookie changes (e.g. a failed refresh clearing the session).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
