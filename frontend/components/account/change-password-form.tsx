"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState, useActionState } from "react";

import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { changePassword, type ChangePasswordState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, validateChangePassword } from "@/lib/auth-validation";

function ChangePasswordFields({
  formAction,
  isPending,
  state,
  formKey,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  state: ChangePasswordState;
  formKey: number;
}) {
  const { values, errorFor, register, onSubmit } = useFormFields(
    { currentPassword: "", password: "", confirmPassword: "" },
    validateChangePassword,
    state,
  );

  return (
    <form
      key={formKey}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-4"
    >
      <FormAlert message={isPending ? undefined : state.formError} />

      <FormField
        id="currentPassword"
        label="Current password"
        error={errorFor("currentPassword")}
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={fieldDescribedBy("currentPassword")}
          {...register("currentPassword")}
        />
      </FormField>

      <FormField
        id="password"
        label="New password"
        error={errorFor("password")}
        hint={
          <>
            <PasswordStrengthMeter password={values.password} id="change-password-strength" />
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

      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errorFor("confirmPassword")}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={fieldDescribedBy("confirmPassword")}
          {...register("confirmPassword")}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Updating…" : "Change password"}
        </Button>
        <p
          aria-live="polite"
          className="flex items-center gap-1.5 text-body-sm text-emerald-700 empty:hidden"
        >
          {state.changed && !isPending ? (
            <>
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              Password updated
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {},
  );
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.changeId) setFormKey(state.changeId);
  }, [state.changeId]);

  return (
    <ChangePasswordFields
      formAction={formAction}
      isPending={isPending}
      state={state}
      formKey={formKey}
    />
  );
}
