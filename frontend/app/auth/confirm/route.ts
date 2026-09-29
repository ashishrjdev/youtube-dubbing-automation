import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * Landing point for links in Supabase auth emails (signup confirmation).
 *
 * Supabase verifies the email *before* redirecting here, then appends either
 * ?code=... (PKCE, default template) or ?error_code=... on failure. A custom
 * email template may instead send ?token_hash=...&type=... directly.
 * This runs as a Route Handler because it has to set the session cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = (status: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = `?status=${status}`;
    return NextResponse.redirect(url);
  };

  const errorCode = searchParams.get("error_code");
  if (errorCode) return result(errorCode === "otp_expired" ? "expired" : "invalid");

  const supabase = await createServerSupabaseClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // The email is already confirmed at this point. The exchange only fails
    // when the link is opened in a different browser than the one used to
    // sign up (no PKCE verifier cookie), so ask them to log in instead.
    return result(error ? "verified-login" : "verified");
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return result("verified");
    return result(error.code === "otp_expired" ? "expired" : "invalid");
  }

  return result("invalid");
}
