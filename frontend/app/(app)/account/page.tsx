import type { Metadata } from "next";
import { KeyRound, LogOut } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { signOut } from "@/lib/auth-actions";
import { getCurrentUserEmail } from "@/lib/current-user";
import { initialsFromEmail } from "@/lib/initials";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Account",
};

function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={cn(
        "grid gap-6 rounded-2xl border bg-card p-6 shadow-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-10 sm:p-8",
        tone === "danger" ? "border-error-container" : "border-border/70",
      )}
    >
      <div className="grid content-start gap-1">
        <h2 className={cn("text-body-lg font-semibold", tone === "danger" ? "text-destructive" : "text-foreground")}>
          {title}
        </h2>
        <p className="text-body-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const email = await getCurrentUserEmail();

  return (
    <div className="grid gap-8">
      <PageHeader title="Account" description="Manage your profile, security, and sessions." />

      <SettingsSection title="Profile" description="The email address you sign in with.">
        <div className="flex items-center gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-brand-indigo text-body-lg font-semibold text-white"
            aria-hidden="true"
          >
            {initialsFromEmail(email)}
          </span>
          <div className="min-w-0">
            <p className="text-label-sm text-muted-foreground">Email</p>
            <p className="truncate text-body-md font-medium text-foreground">{email ?? "Unknown"}</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Password"
        description="We'll email you a secure link to choose a new password."
      >
        <ButtonLink href="/forgot-password" variant="outline" size="lg">
          <KeyRound className="size-4" aria-hidden="true" />
          Reset password
        </ButtonLink>
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="Sign out everywhere, including other browsers and devices."
      >
        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg">
            <LogOut className="size-4" aria-hidden="true" />
            Log out of all devices
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection
        tone="danger"
        title="Delete account"
        description="Permanently delete your account and all of your projects."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="destructive" size="lg" disabled>
            Delete account
          </Button>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
      </SettingsSection>
    </div>
  );
}
