import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { TextLink } from "@/components/text-link";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      description={`Join ${APP_NAME} today`}
      footer={
        <>
          <span className="text-muted-foreground">Already have an account?</span>{" "}
          <TextLink href="/login">Log in</TextLink>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
