import type { Metadata } from "next";

import { ProjectDashboard } from "@/components/projects/project-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <ProjectDashboard />;
}
