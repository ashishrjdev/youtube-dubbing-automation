import { cookies } from "next/headers";
import { cache } from "react";

import { HOW_IT_WORKS_SEEN_COOKIE, HOW_IT_WORKS_SEEN_KEY } from "@/lib/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase";

/** Verified JWT claims of the signed-in user, once per request. */
const getClaims = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

/** Email of the signed-in user. */
export async function getCurrentUserEmail(): Promise<string | null> {
  const email = (await getClaims())?.email;
  return typeof email === "string" ? email : null;
}

export async function hasSeenHowItWorks(): Promise<boolean> {
  if ((await cookies()).get(HOW_IT_WORKS_SEEN_COOKIE)?.value === "1") return true;
  return (await getClaims())?.user_metadata?.[HOW_IT_WORKS_SEEN_KEY] === true;
}
