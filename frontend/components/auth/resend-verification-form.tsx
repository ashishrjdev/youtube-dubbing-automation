"use client";

import { CircleCheck } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { resendVerificationEmail, type ResendVerificationState } from "@/lib/auth-actions";
import { validateEmail } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/verification";

type State = ResendVerificationState & { cooldownUntil?: number };

const validateWithEmail = ({ email }: { email: string }) => {
  const error = validateEmail(email);
  return error ? { email: error } : {};
};
const validateNothing = () => ({});

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
  // Before the first tick `now` is null or from an earlier cooldown: clamp.
  const remaining = Math.ceil((until - (now ?? 0)) / 1000);
  return Math.min(RESEND_COOLDOWN_SECONDS, Math.max(0, remaining));
}

/**
 * "Resend verification email" with a 60s cooldown after each send. Without
 * `askForEmail`, the server resends to the signed-in user's (or just-signed-up)
 * address; with it, the user types the address (e.g. after an expired link
 * opened on another device).
 */
export function ResendVerificationForm({
  askForEmail = false,
  compact = false,
  className,
}: {
  askForEmail?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState<State, FormData>(async (prev, formData) => {
    const result = await resendVerificationEmail(prev, formData);
    return result.sent
      ? { ...result, cooldownUntil: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 }
      : result;
  }, {});
  const { errorFor, register, onSubmit } = useFormFields(
    { email: "" },
    askForEmail ? validateWithEmail : validateNothing,
    state,
  );
  const secondsLeft = useSecondsLeft(state.cooldownUntil);
  const coolingDown = secondsLeft > 0;

  const label = isPending
    ? "Sending…"
    : coolingDown
      ? `Resend in ${secondsLeft}s`
      : "Resend verification email";

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className={cn(compact ? "flex flex-col items-start gap-1.5" : "grid gap-3", className)}
    >
      {compact ? null : <FormAlert message={isPending ? undefined : state.formError} />}

      {askForEmail ? (
        <FormField id="resend-email" label="Email address" error={errorFor("email")}>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby={fieldDescribedBy("resend-email")}
            {...register("email")}
          />
        </FormField>
      ) : null}

      <Button
        type="submit"
        variant={compact ? "outline" : "default"}
        size="lg"
        disabled={isPending || coolingDown}
        className={cn(!compact && "w-full", "tabular-nums")}
      >
        {label}
      </Button>

      <p
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-body-sm empty:hidden",
          compact ? "text-on-tertiary-fixed" : "justify-center text-emerald-700",
        )}
      >
        {state.sent && !isPending ? (
          <>
            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            Verification email sent. Check your inbox.
          </>
        ) : compact && state.formError && !isPending ? (
          state.formError
        ) : null}
      </p>
    </form>
  );
}
