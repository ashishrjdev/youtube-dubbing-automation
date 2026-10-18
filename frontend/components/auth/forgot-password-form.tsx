"use client";

import { ArrowLeft, CircleCheck, Mail } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { requestPasswordReset, type PasswordResetRequestState } from "@/lib/auth-actions";
import { validateEmail } from "@/lib/auth-validation";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/verification";

type State = PasswordResetRequestState & { cooldownUntil?: number };

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

/** Whole seconds left until `until` (a Date.now() timestamp), ticking while > 0. */
function useSecondsLeft(until: number | undefined): number {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [until]);

  if (!until) return 0;
  const remaining = Math.ceil((until - (now ?? 0)) / 1000);
  return Math.min(RESEND_COOLDOWN_SECONDS, Math.max(0, remaining));
}

export function ForgotPasswordFlow() {
  const [state, formAction, isPending] = useActionState<State, FormData>(async (prev, formData) => {
    const result = await requestPasswordReset(prev, formData);
    return result.sent
      ? { ...result, cooldownUntil: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 }
      : result;
  }, {});
  const { errorFor, register, onSubmit } = useFormFields({ email: "" }, validate, state);
  const secondsLeft = useSecondsLeft(state.cooldownUntil);
  const coolingDown = secondsLeft > 0;

  const label = isPending
    ? "Sending…"
    : coolingDown
      ? `Send again in ${secondsLeft}s`
      : state.sent
        ? "Send another link"
        : "Send reset link";

  return (
    <AuthCard
      icon={state.sent ? Mail : undefined}
      title={state.sent ? "Check your email" : "Reset your password"}
      description={
        state.sent
          ? "If an account exists for that email, we've sent a reset link."
          : "Enter your email and we'll send you a link."
      }
      footer={backToLogin}
    >
      <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormAlert message={isPending ? undefined : state.formError} />

        {state.sent && !isPending ? (
          <p
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700"
          >
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              If an account exists for that email, we&apos;ve sent a reset link. The link expires in 1
              hour. Don&apos;t see it? Check your spam folder.
            </span>
          </p>
        ) : null}

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

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full tabular-nums"
          disabled={isPending || coolingDown}
        >
          {label}
        </Button>
      </form>
    </AuthCard>
  );
}
