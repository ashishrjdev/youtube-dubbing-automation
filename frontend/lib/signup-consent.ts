/**
 * Signup consent (LEGAL-05). Pure helpers so the checkbox gate and the
 * metadata payload can be unit-tested without hitting Supabase.
 *
 * Consent is enforced in our signup form/Server Action only. The Auth API
 * itself does not require these fields — see README "Consent records".
 */
import {
  type FieldErrors,
  type SignupFields,
  validateSignup,
} from "./auth-validation.ts";

/** Same key as FULL_NAME_KEY in current-user.ts (kept local so tests stay free of Next imports). */
const FULL_NAME_METADATA_KEY = "full_name";

export const CONSENT_ERROR =
  "You need to accept the Terms and Privacy Policy to create an account.";

export type SignupConsentFields = SignupFields & { acceptedTerms: boolean };
export type SignupConsentFieldErrors = FieldErrors<SignupConsentFields>;

export function validateAcceptedTerms(accepted: boolean): string | undefined {
  return accepted ? undefined : CONSENT_ERROR;
}

export function validateSignupWithConsent(
  fields: SignupConsentFields,
): SignupConsentFieldErrors {
  return Object.fromEntries(
    Object.entries({
      ...validateSignup(fields),
      acceptedTerms: validateAcceptedTerms(fields.acceptedTerms),
    }).filter(([, message]) => message),
  ) as SignupConsentFieldErrors;
}

export type SignupConsentMetadata = {
  full_name: string;
  terms_version: string;
  privacy_version: string;
  consent_accepted_at: string;
};

export function buildSignupConsentMetadata(
  fullName: string,
  termsVersion: string,
  privacyVersion: string,
  consentAcceptedAt: string = new Date().toISOString(),
): SignupConsentMetadata {
  return {
    [FULL_NAME_METADATA_KEY]: fullName,
    terms_version: termsVersion,
    privacy_version: privacyVersion,
    consent_accepted_at: consentAcceptedAt,
  };
}

export type PrepareSignUpResult =
  | { ok: false; fieldErrors: SignupConsentFieldErrors }
  | { ok: true; metadata: SignupConsentMetadata };

/**
 * Gate before calling Supabase. When `ok` is false, do not call signUp.
 * When `ok` is true, pass `metadata` as `options.data`.
 */
export function prepareSignUp(
  fields: SignupConsentFields,
  termsVersion: string,
  privacyVersion: string,
  consentAcceptedAt?: string,
): PrepareSignUpResult {
  const fieldErrors = validateSignupWithConsent(fields);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    metadata: buildSignupConsentMetadata(
      fields.fullName.trim(),
      termsVersion,
      privacyVersion,
      consentAcceptedAt,
    ),
  };
}
