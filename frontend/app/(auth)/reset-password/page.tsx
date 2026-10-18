import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound, MailX } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { TextLink } from "@/components/text-link";
import { ButtonLink } from "@/components/ui/button-link";
import { createServerSupabaseClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Set a new password",
};

const backToLogin = (
  <TextLink href="/login" variant="subtle">
    <ArrowLeft className="size-4" aria-hidden="true" />
    Back to log in
  </TextLink>
);

/**
 * Public route. The form is only shown when a recovery (or existing) session
 * is present — typically after /auth/confirm?flow=recovery exchanged the
 * email link's PKCE code into httpOnly cookies. Invalid / expired / reused
 * links land here with ?status=expired|invalid and no usable session.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;

  // Older emails (and any template still pointing here) arrive with ?code= or
  // ?error_code=; hand them to the shared exchange route.
  if (
    typeof params.code === "string" ||
    typeof params.error_code === "string" ||
    typeof params.error === "string" ||
    typeof params.token_hash === "string"
  ) {
    const query = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    query.set("flow", "recovery");
    redirect(`/auth/confirm?${query}`);
  }

  const status = typeof params.status === "string" ? params.status : null;

  if (status === "expired" || status === "invalid") {
    return (
      <AuthCard
        icon={MailX}
        title={status === "expired" ? "Link expired" : "Link not valid"}
        description={
          status === "expired"
            ? "This reset link has expired or was already used. Request a new one below."
            : "We couldn't open this reset link. It may have already been used, or it was opened in a different browser than the one that requested it."
        }
        footer={backToLogin}
      >
        <ButtonLink href="/forgot-password" size="lg" className="w-full">
          Request a new link
        </ButtonLink>
      </AuthCard>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthCard
        icon={MailX}
        title="Link not valid"
        description="This reset link is invalid, expired, or already used. Request a new one to continue."
        footer={backToLogin}
      >
        <ButtonLink href="/forgot-password" size="lg" className="w-full">
          Request a new link
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Set a new password"
      description="Choose a new password for your account. You'll stay signed in on this device; other devices will be signed out."
      footer={backToLogin}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
