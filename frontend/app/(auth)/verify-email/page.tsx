import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleCheck, MailCheck, MailX, type LucideIcon } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/text-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verify your email",
};

type Status = "pending" | "verified" | "verified-login" | "expired" | "invalid";

const CONTENT: Record<
  Status,
  { icon: LucideIcon; title: string; description: string; action?: { href: string; label: string } }
> = {
  // Shown after every signup attempt, including for addresses that already
  // have an account (no email is sent then), so the copy must fit both cases.
  pending: {
    icon: MailCheck,
    title: "Verify your email",
    description:
      "We've sent a verification link to the address you entered. Click it to activate your account.",
  },
  verified: {
    icon: CircleCheck,
    title: "Email verified",
    description: "Your account is active. You're all set.",
    action: { href: "/dashboard", label: "Continue to dashboard" },
  },
  "verified-login": {
    icon: CircleCheck,
    title: "Email verified",
    description: "Your account is active. Log in to continue.",
    action: { href: "/login", label: "Log in" },
  },
  expired: {
    icon: MailX,
    title: "Link expired",
    description:
      "This verification link has expired or was already used. If you've already verified, just log in. Otherwise, sign up again to get a new link.",
    action: { href: "/login", label: "Log in" },
  },
  invalid: {
    icon: MailX,
    title: "Link not valid",
    description:
      "We couldn't verify this link. Try opening it again from the email, or sign up again to get a new one.",
    action: { href: "/signup", label: "Back to sign up" },
  },
};

function toStatus(value: unknown): Status {
  return typeof value === "string" && Object.hasOwn(CONTENT, value) ? (value as Status) : "pending";
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;

  // Links in emails sent before /auth/confirm existed point here directly.
  if (typeof params.code === "string" || typeof params.error_code === "string") {
    const query = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    redirect(`/auth/confirm?${query}`);
  }

  const status = toStatus(params.status);
  const { icon, title, description, action } = CONTENT[status];

  return (
    <AuthCard
      icon={icon}
      title={title}
      description={description}
      footer={
        status === "pending" || status === "invalid" ? (
          <TextLink href="/login" variant="subtle">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to log in
          </TextLink>
        ) : undefined
      }
    >
      {action ? (
        <Link href={action.href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {action.label}
        </Link>
      ) : null}
      {status === "pending" ? (
        <p className="text-center text-body-sm text-muted-foreground">
          Don&apos;t see it? Check your spam folder. If you already have an account with this
          email, <TextLink href="/login">log in</TextLink> instead.
        </p>
      ) : null}
    </AuthCard>
  );
}
