import { NextResponse, type NextRequest } from "next/server";

import { createProxySupabaseClient } from "@/lib/supabase";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createProxySupabaseClient(request, () => {
    response = NextResponse.next({ request });
    return response;
  });

  // Refreshes an expired access token using the refresh token and writes the
  // rotated tokens back as httpOnly cookies before the page/route handler runs.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
