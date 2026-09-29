"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  type FieldErrors,
  type LoginFieldErrors,
  type SignupFieldErrors,
  safeRedirectPath,
  validateEmail,
  validateLogin,
  validateSignup,
} from "@/lib/auth-validation";
import { createServerSupabaseClient } from "@/lib/supabase";

const GENERIC_ERROR = "Something went wrong, please try again.";
const RATE_LIMITED = "Too many attempts. Please wait a few minutes and try again.";
const INVALID_EMAIL = "Enter a valid email address, like name@example.com.";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  // Next.js rejects Server Action calls whose Origin doesn't match the host.
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

// Never log the email or password; the code and status are enough.
function logAuthError(action: string, error: { code?: string; name: string; status?: number }) {
  console.error(`${action} failed: code=${error.code || error.name} status=${error.status}`);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  // Global scope revokes the session server-side (the backend rejects the old
  // access token immediately) and clears the auth cookies.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export type SignUpState = {
  fieldErrors?: SignupFieldErrors;
  formError?: string;
};

// Treated exactly like success so the response never reveals whether the email
// is already registered. With "Confirm email" on, Supabase already answers a
// duplicate signup with a fake success; these codes cover the leftovers:
// - user_already_exists / email_exists: returned if confirmation is ever disabled.
// - over_email_send_rate_limit: re-signing up an existing *unconfirmed* address
//   within 60s trips a per-user limit that a brand-new address never would.
const SIGNUP_INDISTINGUISHABLE_FROM_SUCCESS = new Set([
  "user_already_exists",
  "email_exists",
  "over_email_send_rate_limit",
]);

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors = validateSignup({ email, password, confirmPassword });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${await requestOrigin()}/auth/confirm` },
    });

    if (error && !SIGNUP_INDISTINGUISHABLE_FROM_SUCCESS.has(error.code ?? "")) {
      logAuthError("signUp", error);
      // These depend only on the submitted values or the caller's IP, never on
      // whether the account exists, so they're safe to surface.
      if (error.code === "weak_password") {
        return { fieldErrors: { password: "Choose a stronger password." } };
      }
      if (error.code === "email_address_invalid") return { fieldErrors: { email: INVALID_EMAIL } };
      if (error.code === "over_request_rate_limit") return { formError: RATE_LIMITED };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("signUp failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  redirect("/verify-email");
}

export type SignInState = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("next"));

  const fieldErrors = validateLogin({ email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let destination = next;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logAuthError("signIn", error);
      // Same message for "no such user" and "wrong password" (Supabase returns
      // invalid_credentials for both), so login can't be used to probe emails.
      if (error.code === "invalid_credentials") {
        return { fieldErrors: { password: "Invalid email or password. Please try again." } };
      }
      // Only reachable with the correct password, so it reveals nothing new.
      if (error.code === "email_not_confirmed") {
        destination = "/verify-email";
      } else if (error.code === "over_request_rate_limit") {
        return { formError: RATE_LIMITED };
      } else {
        return { formError: GENERIC_ERROR };
      }
    }
  } catch {
    console.error("signIn failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  redirect(destination);
}

export type PasswordResetRequestState = {
  fieldErrors?: FieldErrors<{ email: string }>;
  formError?: string;
  sent?: boolean;
};

export async function requestPasswordReset(
  _prev: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);
  if (emailError) return { fieldErrors: { email: emailError } };

  try {
    const supabase = await createServerSupabaseClient();
    // Supabase returns success for unknown emails too; we always show the same
    // "check your email" screen. The per-user email rate limit only triggers
    // for real accounts, so it's also reported as success.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await requestOrigin()}/reset-password`,
    });
    if (error && error.code !== "over_email_send_rate_limit") {
      logAuthError("requestPasswordReset", error);
      if (error.code === "email_address_invalid") return { fieldErrors: { email: INVALID_EMAIL } };
      if (error.code === "over_request_rate_limit") return { formError: RATE_LIMITED };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("requestPasswordReset failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  return { sent: true };
}
