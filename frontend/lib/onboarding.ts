/**
 * "How it works" is shown automatically once per account. The flag lives in
 * Supabase user_metadata (so it follows the user across devices); the cookie
 * covers the gap until the access token (and its claims) is refreshed.
 */
export const HOW_IT_WORKS_SEEN_KEY = "how_it_works_seen";
export const HOW_IT_WORKS_SEEN_COOKIE = "how_it_works_seen";
