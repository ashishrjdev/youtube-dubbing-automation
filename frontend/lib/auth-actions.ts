"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase";

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  // Global scope revokes the session server-side (the backend rejects the old
  // access token immediately) and clears the auth cookies.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
