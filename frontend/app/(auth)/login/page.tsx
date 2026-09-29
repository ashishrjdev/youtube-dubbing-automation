import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { TextLink } from "@/components/text-link";
import { safeRedirectPath } from "@/lib/auth-validation";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" ? safeRedirectPath(next) : undefined;

  return (
    <AuthCard
      title="Welcome back"
      description={`Log in to your ${APP_NAME} account`}
      footer={
        <>
          <span className="text-muted-foreground">Don&apos;t have an account?</span>{" "}
          <TextLink href="/signup">Sign up</TextLink>
        </>
      }
    >
      <LoginForm next={safeNext} />
    </AuthCard>
  );
}
