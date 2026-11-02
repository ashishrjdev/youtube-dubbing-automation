import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NewProjectTabs } from "@/components/projects/new-project-tabs";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "New project",
};

export default async function NewProjectPage() {
  // The app layout's banner explains why; the backend enforces this too.
  const user = await getCurrentUser();
  if (!user?.emailVerified) redirect("/dashboard");

  return <NewProjectTabs />;
}
