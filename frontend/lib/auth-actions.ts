"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  type ChangePasswordFieldErrors,
  type FieldErrors,
  type LoginFieldErrors,
  type ResetPasswordFieldErrors,
  type SignupFieldErrors,
  safeRedirectPath,
  validateChangePassword,
  validateEmail,
  validateFullName,
  validateLogin,
  validateResetPassword,
} from "@/lib/auth-validation";
import { rateLimitMessage } from "@/lib/auth-rate-limit";
import { FULL_NAME_KEY, getCurrentUser } from "@/lib/current-user";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { prepareSignUp, type SignupConsentFieldErrors } from "@/lib/signup-consent";
import { createEphemeralSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import {
  PENDING_VERIFICATION_COOKIE,
  PENDING_VERIFICATION_MAX_AGE_SECONDS,
} from "@/lib/verification";

const GENERIC_ERROR = "Something went wrong, please try again.";
const INVALID_CREDENTIALS = "Invalid email or password.";
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

async function rememberPendingVerification(email: string) {
  (await cookies()).set(PENDING_VERIFICATION_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_VERIFICATION_MAX_AGE_SECONDS,
  });
}

/**
 * @deprecated Prefer `logout()` from `@/lib/logout`, which navigates to
 * `/auth/logout`. Kept only so any lingering form actions still work.
 */
export async function signOut() {
  redirect("/auth/logout");
}

export type SignUpState = {
  fieldErrors?: SignupFieldErrors & SignupConsentFieldErrors;
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
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  // Consent gate: never call Supabase when the box is unchecked (LEGAL-05).
  const prepared = prepareSignUp(
    { fullName, email, password, confirmPassword, acceptedTerms },
    TERMS_VERSION,
    PRIVACY_VERSION,
  );
  if (!prepared.ok) return { fieldErrors: prepared.fieldErrors };

  try {
    const supabase = await createServerSupabaseClient();
    // Never log metadata or passwords (SEC-01). Consent versions come from
    // TERMS_VERSION / PRIVACY_VERSION (LEGAL-01/02), not from the client.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${await requestOrigin()}/auth/confirm`,
        data: prepared.metadata,
      },
    });

    if (error && !SIGNUP_INDISTINGUISHABLE_FROM_SUCCESS.has(error.code ?? "")) {
      logAuthError("signUp", error);
      // These depend only on the submitted values or the caller's IP, never on
      // whether the account exists, so they're safe to surface.
      if (error.code === "weak_password") {
        return { fieldErrors: { password: "Choose a stronger password." } };
      }
      if (error.code === "email_address_invalid") return { fieldErrors: { email: INVALID_EMAIL } };
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("signUp failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  await rememberPendingVerification(email);
  redirect("/verify-email");
}

export type SignInState = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  /** Correct password, but the email isn't confirmed yet. */
  unverified?: boolean;
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("next"));

  const fieldErrors = validateLogin({ email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logAuthError("signIn", error);
      // Supabase returns invalid_credentials for unknown emails, wrong passwords,
      // and unconfirmed accounts with a wrong password alike, so login can't be
      // used to probe which emails are registered.
      if (error.code === "invalid_credentials") return { formError: INVALID_CREDENTIALS };
      // Only returned after the password matched, so it reveals nothing new.
      if (error.code === "email_not_confirmed") {
        await rememberPendingVerification(email);
        return { unverified: true };
      }
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("signIn failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  redirect(next);
}

export type UpdateProfileState = {
  fieldErrors?: FieldErrors<{ fullName: string }>;
  formError?: string;
  saved?: boolean;
};

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const fullNameError = validateFullName(fullName);
  if (fullNameError) return { fieldErrors: { fullName: fullNameError } };

  try {
    const supabase = await createServerSupabaseClient();
    // Fails with no session, so a signed-out request can't change anything.
    const { error } = await supabase.auth.updateUser({ data: { [FULL_NAME_KEY]: fullName } });
    if (error) {
      logAuthError("updateProfile", error);
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("updateProfile failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  // The header avatar and menu are rendered by the (app) layout.
  revalidatePath("/", "layout");
  return { saved: true };
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
    // Supabase returns success for unknown emails too (verified). The per-user
    // email rate limit only triggers for real accounts, so reporting it would
    // reveal which emails are registered — treat it as success. IP-wide
    // request limits are safe to surface.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await requestOrigin()}/auth/confirm?flow=recovery`,
    });
    if (error && error.code !== "over_email_send_rate_limit") {
      logAuthError("requestPasswordReset", error);
      if (error.code === "email_address_invalid") return { fieldErrors: { email: INVALID_EMAIL } };
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("requestPasswordReset failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  return { sent: true };
}

export type UpdatePasswordState = {
  fieldErrors?: ResetPasswordFieldErrors;
  formError?: string;
  updated?: boolean;
};

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors = validateResetPassword({ password, confirmPassword });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { formError: "This reset link is invalid or has expired. Request a new one." };
    }

    // Never log password. updateUser only gets the new value.
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      logAuthError("updatePassword", error);
      if (error.code === "weak_password") {
        return { fieldErrors: { password: "Choose a stronger password." } };
      }
      if (error.code === "same_password") {
        return { fieldErrors: { password: "Choose a password you haven't used before." } };
      }
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }

    // Drop every other device/session. Supabase does not reliably revoke them
    // on password change alone; scope "others" keeps this recovery session.
    await supabase.auth.signOut({ scope: "others" });
  } catch {
    console.error("updatePassword failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { updated: true };
}

export type ChangePasswordState = {
  fieldErrors?: ChangePasswordFieldErrors;
  formError?: string;
  /** Set on success so the form can clear fields and show a message. */
  changed?: boolean;
  changeId?: number;
};

const CURRENT_PASSWORD_INCORRECT = "Current password is incorrect.";
const PASSWORD_UNCHANGED =
  "Your password was not changed. Something went wrong, please try again.";

/**
 * Logged-in change-password.
 *
 * Preferred: Supabase `updateUser({ password, current_password })` with
 * Authentication → Providers → Email → "Require current password when changing
 * password" enabled (free plan). That setting is currently off on this project,
 * so wrong `current_password` values are ignored by Auth — verified by probe.
 *
 * Fallback (enforced here): verify the current password with
 * `signInWithPassword` on an ephemeral client that never touches cookies, then
 * revoke that temporary session. This protects our Account form only; anyone
 * calling Supabase directly with a stolen session can still change the password
 * until the dashboard toggle is on. We still send `current_password` so enabling
 * the toggle adds server-side enforcement without a code change.
 *
 * Passwords are never logged (SEC-01).
 */
export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors = validateChangePassword({
    currentPassword,
    password,
    confirmPassword,
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return { formError: PASSWORD_UNCHANGED };
    }

    // Fallback verification: separate client, no cookie/storage persistence.
    const verifier = createEphemeralSupabaseClient();
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      logAuthError("changePassword.verify", verifyError);
      if (
        verifyError.code === "invalid_credentials" ||
        verifyError.code === "user_not_found"
      ) {
        return { fieldErrors: { currentPassword: CURRENT_PASSWORD_INCORRECT } };
      }
      const verifyRateLimited = rateLimitMessage(verifyError);
      if (verifyRateLimited) return { formError: verifyRateLimited };
      return { formError: PASSWORD_UNCHANGED };
    }
    // Drop the temporary session so verification does not leave a second login.
    await verifier.auth.signOut({ scope: "local" });

    // Never log passwords. current_password is enforced by Supabase once the
    // "Require current password when changing password" setting is on (README).
    const { error } = await supabase.auth.updateUser({
      password,
      current_password: currentPassword,
    });
    if (error) {
      logAuthError("changePassword", error);
      if (
        error.code === "current_password_invalid" ||
        error.code === "invalid_credentials" ||
        error.code === "reauthentication_not_valid" ||
        error.code === "current_password_required"
      ) {
        return { fieldErrors: { currentPassword: CURRENT_PASSWORD_INCORRECT } };
      }
      if (error.code === "same_password") {
        return {
          fieldErrors: {
            password: "New password must be different from your current password.",
          },
        };
      }
      if (error.code === "weak_password") {
        return { fieldErrors: { password: "Choose a stronger password." } };
      }
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: PASSWORD_UNCHANGED };
    }

    // Password change alone does not revoke other devices; keep this session.
    await supabase.auth.signOut({ scope: "others" });
  } catch {
    console.error("changePassword failed: unexpected exception");
    return { formError: PASSWORD_UNCHANGED };
  }

  revalidatePath("/", "layout");
  return { changed: true, changeId: Date.now() };
}

export type ResendVerificationState = {
  fieldErrors?: FieldErrors<{ email: string }>;
  formError?: string;
  sent?: boolean;
};

// Same reasoning as signup: these only occur for addresses that do (or don't)
// have an account, so reporting them would reveal which emails are registered.
const RESEND_INDISTINGUISHABLE_FROM_SUCCESS = new Set([
  "over_email_send_rate_limit",
  "user_not_found",
  "user_already_exists",
  "email_exists",
]);

/** The address to resend to when the form doesn't ask for one. */
async function knownPendingEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user?.email && !user.emailVerified) return user.email;
  return (await cookies()).get(PENDING_VERIFICATION_COOKIE)?.value ?? null;
}

export async function resendVerificationEmail(
  _prev: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const typed = String(formData.get("email") ?? "").trim();
  const email = typed || (await knownPendingEmail());
  if (!email) return { formError: "Enter the email address you signed up with." };
  const emailError = validateEmail(email);
  if (emailError) return { fieldErrors: { email: emailError } };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${await requestOrigin()}/auth/confirm` },
    });
    if (error && !RESEND_INDISTINGUISHABLE_FROM_SUCCESS.has(error.code ?? "")) {
      logAuthError("resendVerificationEmail", error);
      if (error.code === "email_address_invalid") return { fieldErrors: { email: INVALID_EMAIL } };
      const rateLimited = rateLimitMessage(error);
      if (rateLimited) return { formError: rateLimited };
      return { formError: GENERIC_ERROR };
    }
  } catch {
    console.error("resendVerificationEmail failed: unexpected exception");
    return { formError: GENERIC_ERROR };
  }

  if (typed) await rememberPendingVerification(typed);
  return { sent: true };
}
