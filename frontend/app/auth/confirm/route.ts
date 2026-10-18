import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { PENDING_VERIFICATION_COOKIE } from "@/lib/verification";

/**
 * Landing point for links in Supabase auth emails (signup confirmation and
 * password recovery).
 *
 * Supabase verifies the token *before* redirecting here, then appends either
 * ?code=... (PKCE, default template) or ?error_code=... on failure. A custom
 * email template may instead send ?token_hash=...&type=... directly.
 * This runs as a Route Handler because it has to set the session cookies.
 *
 * Password-reset emails use redirectTo=/auth/confirm?flow=recovery so a
 * successful exchange lands on /reset-password instead of /verify-email.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const flow = searchParams.get("flow");
  const isRecovery = flow === "recovery";

  const result = (status: string) => {
    const url = request.nextUrl.clone();
    if (isRecovery) {
      url.pathname = "/reset-password";
      url.search = status === "ok" ? "" : `?status=${status}`;
    } else {
      url.pathname = "/verify-email";
      url.search = `?status=${status}`;
    }
    const response = NextResponse.redirect(url);
    if (!isRecovery && status.startsWith("verified")) {
      response.cookies.delete(PENDING_VERIFICATION_COOKIE);
    }
    return response;
  };

  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    const expired = errorCode === "otp_expired" || errorCode === "expired";
    return result(expired ? "expired" : "invalid");
  }

  const supabase = await createServerSupabaseClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (isRecovery) {
      // Recovery needs the session to call updateUser({ password }). A failed
      // exchange usually means the link was opened in a different browser than
      // the one that requested the reset (no PKCE verifier cookie).
      return result(error ? "invalid" : "ok");
    }
    // Signup: the email is already confirmed at this point. Exchange only
    // fails when the link was opened in a different browser, so ask them to
    // log in instead.
    return result(error ? "verified-login" : "verified");
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      if (isRecovery || type === "recovery") return result("ok");
      return result("verified");
    }
    return result(error.code === "otp_expired" ? "expired" : "invalid");
  }

  return result("invalid");
}
