/**
 * Email address awaiting verification, remembered after signup (or a login
 * blocked by email_not_confirmed) so /verify-email can offer "Resend" without
 * putting the address in the URL. httpOnly: only Server Actions read it.
 */
export const PENDING_VERIFICATION_COOKIE = "pending_verification_email";
export const PENDING_VERIFICATION_MAX_AGE_SECONDS = 60 * 60 * 24;

/** UI cooldown between resends; matches Supabase's per-address email limit. */
export const RESEND_COOLDOWN_SECONDS = 60;
