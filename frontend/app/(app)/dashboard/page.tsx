import type { Metadata } from "next";
import { Clapperboard, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { HowItWorksButton } from "@/components/how-it-works-dialog";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Projects"
        description="Turn any video into a natural-sounding dub, one project at a time."
      />

      <EmptyState
        icon={Clapperboard}
        title="No projects yet"
        description="Start with a YouTube link or an audio file. We'll transcribe it, help you polish the script, and generate the dubbed voice track."
        action={
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/projects/new" size="lg">
              <Plus className="size-4" aria-hidden="true" />
              New project
            </ButtonLink>
            <HowItWorksButton />
          </div>
        }
      />
    </div>
  );
}
