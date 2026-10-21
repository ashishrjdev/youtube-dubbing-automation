/**
 * Shared Supabase Auth rate-limit handling (AUTH-10).
 *
 * Supabase Auth (not FastAPI) enforces these limits. When a limit trips it
 * returns HTTP 429 with `over_request_rate_limit` (endpoint limit, normally
 * per IP) or `over_email_send_rate_limit` (project email-sending limit).
 * See https://supabase.com/docs/guides/auth/rate-limits and the error-code
 * reference. Every auth form must surface RATE_LIMIT_MESSAGE for these —
 * never a generic error — and the copy must not hardcode a limit number,
 * since limits are configurable in the dashboard.
 *
 * Pure module (no server/client imports) so it can be unit-tested directly.
 */

export const RATE_LIMIT_MESSAGE =
  "Too many attempts, please try again in a few minutes.";

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
]);

export type AuthErrorLike = {
  code?: string;
  status?: number;
} | null | undefined;

/** True for HTTP 429 or a known Supabase Auth rate-limit error code. */
export function isRateLimitError(error: AuthErrorLike): boolean {
  if (!error) return false;
  return error.status === 429 || RATE_LIMIT_CODES.has(error.code ?? "");
}

/** The shared rate-limit message for `error`, or null if it isn't one. */
export function rateLimitMessage(error: AuthErrorLike): string | null {
  return isRateLimitError(error) ? RATE_LIMIT_MESSAGE : null;
}
