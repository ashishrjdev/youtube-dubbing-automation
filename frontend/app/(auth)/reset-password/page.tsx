import type { Metadata } from "next";
import { ArrowLeft, KeyRound } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/text-link";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      icon={KeyRound}
      title="Set a new password"
      description="Choosing a new password from this link isn't available yet. We're finishing it up."
      footer={
        <TextLink href="/login" variant="subtle" className="text-body-sm">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to log in
        </TextLink>
      }
    >
      <ButtonLink href="/forgot-password" variant="outline" size="lg" className="w-full">
        Request another reset link
      </ButtonLink>
    </AuthCard>
  );
}
