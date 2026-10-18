import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { PENDING_VERIFICATION_COOKIE } from "@/lib/verification";

/**
 * Full-page logout. Prefer this over a Server Action so cookie clearing always
 * lands on the redirect response, and so a normal navigation still works when
 * a client fetch would fail.
 *
 * scope=local (default): revoke this session's refresh token only.
 * scope=global: revoke every session for the user ("Log out of all devices").
 */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") === "global" ? "global" : "local";
  const login = new URL("/login", request.nextUrl.origin);
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // local still hits Supabase Auth and destroys this session's refresh token.
    // Access JWTs can remain valid until exp unless the backend checks the session
    // (ours does, via auth.get_user).
    try {
      await supabase.auth.signOut({ scope });
    } catch (error) {
      console.error(
        `signOut failed: ${error instanceof Error ? error.message : "unexpected"}`,
      );
      // Fall through: still clear cookies below so the browser is logged out.
    }
  }

  // Belt-and-suspenders: drop any leftover auth cookie chunks and the pending
  // verification cookie even if the Supabase call failed or timed out.
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-") || name === PENDING_VERIFICATION_COOKIE) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}
