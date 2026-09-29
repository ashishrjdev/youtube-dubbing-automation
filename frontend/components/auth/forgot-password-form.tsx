"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useActionState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { requestPasswordReset, type PasswordResetRequestState } from "@/lib/auth-actions";
import { validateEmail } from "@/lib/auth-validation";

const validate = ({ email }: { email: string }) => {
  const error = validateEmail(email);
  return error ? { email: error } : {};
};

const backToLogin = (
  <TextLink href="/login" variant="subtle">
    <ArrowLeft className="size-4" aria-hidden="true" />
    Back to log in
  </TextLink>
);

export function ForgotPasswordFlow() {
  const [state, formAction, isPending] = useActionState<PasswordResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );
  const { errorFor, register, onSubmit } = useFormFields({ email: "" }, validate, state);

  if (state.sent) {
    // Identical for registered and unknown emails, so this can't be used to
    // check whether an account exists.
    return (
      <AuthCard
        icon={Mail}
        title="Check your email"
        description="If an account exists for that address, we've sent a link to reset your password."
        footer={backToLogin}
      >
        <p className="text-center text-body-sm text-muted-foreground">
          The link expires in 1 hour. Don&apos;t see it? Check your spam folder.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a link."
      footer={backToLogin}
    >
      <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormAlert message={isPending ? undefined : state.formError} />

        <FormField id="email" label="Email address" error={errorFor("email")}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby={fieldDescribedBy("email")}
            {...register("email")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
