"use server";

import { HOW_IT_WORKS_SEEN_KEY } from "@/lib/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function markHowItWorksSeen(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ data: { [HOW_IT_WORKS_SEEN_KEY]: true } });
  if (error) {
    console.error(`markHowItWorksSeen failed: code=${error.code || error.name} status=${error.status}`);
  }
}
