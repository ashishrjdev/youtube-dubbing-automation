import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleCheck, MailCheck, MailX } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { RedirectAfter } from "@/components/auth/redirect-after";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { TextLink } from "@/components/text-link";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentUser } from "@/lib/current-user";
import { PENDING_VERIFICATION_COOKIE } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Verify your email",
};

const REDIRECT_DELAY_MS = 2500;

const backToLogin = (
  <TextLink href="/login" variant="subtle">
    <ArrowLeft className="size-4" aria-hidden="true" />
    Back to log in
  </TextLink>
);

/**
 * State A (no status): just signed up, or a login was blocked because the
 * email isn't confirmed. State B (?status=...): the result of opening the
 * email link, set by /auth/confirm after it exchanged the token server-side.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;

  // Links in emails sent before /auth/confirm existed point here directly.
  if (typeof params.code === "string" || typeof params.error_code === "string") {
    const query = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    redirect(`/auth/confirm?${query}`);
  }

  const status = typeof params.status === "string" ? params.status : "pending";

  if (status === "verified" || status === "verified-login") {
    // "verified-login": confirmed, but the link was opened in another browser
    // so there's no session here; the dashboard sends them through login.
    const href = status === "verified" ? "/dashboard" : "/login?next=/dashboard";
    return (
      <AuthCard
        icon={CircleCheck}
        title="Email verified!"
        description={
          status === "verified"
            ? "Your account is active. Taking you to your dashboard…"
            : "Your account is active. Taking you to log in…"
        }
      >
        <RedirectAfter href={href} delayMs={REDIRECT_DELAY_MS} />
        <ButtonLink href={href} size="lg" className="w-full">
          {status === "verified" ? "Continue to dashboard" : "Log in"}
        </ButtonLink>
      </AuthCard>
    );
  }

  const user = await getCurrentUser();
  if (user?.emailVerified) redirect("/dashboard");
  const pendingEmail =
    (user?.email ?? null) || ((await cookies()).get(PENDING_VERIFICATION_COOKIE)?.value ?? null);

  if (status === "expired" || status === "invalid") {
    return (
      <AuthCard
        icon={MailX}
        title={status === "expired" ? "Link expired" : "Link not valid"}
        description={
          status === "expired"
            ? "This verification link has expired or was already used. Already verified? Just log in. Otherwise, request a new link below."
            : "We couldn't verify this link. Request a new one below, or log in if you've already verified."
        }
        footer={backToLogin}
      >
        {pendingEmail ? (
          <p className="text-center text-body-sm text-muted-foreground">
            We&apos;ll send a new link to{" "}
            <span className="font-semibold break-words text-foreground">{pendingEmail}</span>.
          </p>
        ) : null}
        <ResendVerificationForm askForEmail={!pendingEmail} />
      </AuthCard>
    );
  }

  // Shown after every signup attempt, including for addresses that already
  // have an account (no email is sent then), so the copy must fit both cases.
  return (
    <AuthCard
      icon={MailCheck}
      title="Verify your email"
      description={
        pendingEmail ? (
          <>
            We&apos;ve sent a verification link to{" "}
            <span className="font-semibold break-words text-foreground">{pendingEmail}</span>. Click it
            to activate your account.
          </>
        ) : (
          "We've sent a verification link to your email. Click it to activate your account."
        )
      }
      footer={backToLogin}
    >
      <ResendVerificationForm askForEmail={!pendingEmail} />
      <p className="text-center text-body-sm text-muted-foreground">
        Don&apos;t see it? Check your spam folder. If you already have an account with this email,{" "}
        <TextLink href="/login">log in</TextLink> instead.
      </p>
    </AuthCard>
  );
}
