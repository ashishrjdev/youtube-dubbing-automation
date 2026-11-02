import type { Metadata } from "next";

import { ProjectWorkspace } from "@/components/projects/project-workspace";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  return <ProjectWorkspace projectId={id} />;
}
