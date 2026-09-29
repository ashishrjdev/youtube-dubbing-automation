"use server";

import { cookies } from "next/headers";

import { HOW_IT_WORKS_SEEN_COOKIE, HOW_IT_WORKS_SEEN_KEY } from "@/lib/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function markHowItWorksSeen(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ data: { [HOW_IT_WORKS_SEEN_KEY]: true } });
  if (error) {
    console.error(`markHowItWorksSeen failed: code=${error.code || error.name} status=${error.status}`);
  }

  (await cookies()).set(HOW_IT_WORKS_SEEN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
