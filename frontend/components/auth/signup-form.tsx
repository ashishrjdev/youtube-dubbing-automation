"use client";

import { useActionState } from "react";

import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { signUp, type SignUpState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, validateSignup } from "@/lib/auth-validation";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<SignUpState, FormData>(signUp, {});
  const { values, errorFor, register, onSubmit } = useFormFields(
    { email: "", password: "", confirmPassword: "" },
    validateSignup,
    state,
  );

  return (
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

      <FormField
        id="password"
        label="Password"
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

      <FormField id="confirmPassword" label="Confirm password" error={errorFor("confirmPassword")}>
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
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
