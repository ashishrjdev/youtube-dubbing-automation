import { cache } from "react";

import { HOW_IT_WORKS_SEEN_KEY } from "@/lib/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase";

/** user_metadata key for the name entered at signup or on the Account page. */
export const FULL_NAME_KEY = "full_name";

export type CurrentUser = {
  email: string | null;
  fullName: string | null;
  emailVerified: boolean;
  howItWorksSeen: boolean;
};

/**
 * The signed-in user, once per request, or null when signed out.
 *
 * Uses getUser() (a call to Supabase Auth) rather than the JWT claims:
 * `email_confirmed_at` isn't a claim, and user_metadata in the claims stays
 * stale until the access token is refreshed.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { email, email_confirmed_at, user_metadata } = data.user;
  const fullName = user_metadata?.[FULL_NAME_KEY];
  return {
    email: email ?? null,
    fullName: typeof fullName === "string" && fullName.trim() ? fullName.trim() : null,
    emailVerified: Boolean(email_confirmed_at),
    howItWorksSeen: user_metadata?.[HOW_IT_WORKS_SEEN_KEY] === true,
  };
});
