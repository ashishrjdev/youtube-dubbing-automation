"use client";

import { CircleCheck } from "lucide-react";
import { useActionState } from "react";

import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { RedirectAfter } from "@/components/auth/redirect-after";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { updatePassword, type UpdatePasswordState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, validateResetPassword } from "@/lib/auth-validation";

const REDIRECT_DELAY_MS = 2500;

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    {},
  );
  const { values, errorFor, register, onSubmit } = useFormFields(
    { password: "", confirmPassword: "" },
    validateResetPassword,
    state,
  );

  if (state.updated) {
    return (
      <div className="grid gap-4">
        <p
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Password updated. Taking you to your dashboard…
        </p>
        <RedirectAfter href="/dashboard" delayMs={REDIRECT_DELAY_MS} />
        <ButtonLink href="/dashboard" size="lg" className="w-full">
          Continue to dashboard
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormAlert message={isPending ? undefined : state.formError} />

      <FormField
        id="password"
        label="New password"
        error={errorFor("password")}
        hint={
          <>
            <PasswordStrengthMeter password={values.password} id="password-strength" />
            <span>At least {PASSWORD_MIN_LENGTH} characters, including a number.</span>
          </>
        }
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={fieldDescribedBy("password", { hint: true })}
          {...register("password")}
        />
      </FormField>

      <FormField id="confirmPassword" label="Confirm new password" error={errorFor("confirmPassword")}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={fieldDescribedBy("confirmPassword")}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isPending}>
        {isPending ? "Updating…" : "Reset password"}
      </Button>
    </form>
  );
}
