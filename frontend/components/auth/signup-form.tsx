"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";

import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { signUp, type SignUpState } from "@/lib/auth-actions";
import { FULL_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateSignup } from "@/lib/auth-validation";
import { CONSENT_ERROR } from "@/lib/signup-consent";
import { cn } from "@/lib/utils";

const legalLinkClass =
  "rounded-sm font-medium text-primary underline underline-offset-4 outline-none hover:text-primary-container focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<SignUpState, FormData>(signUp, {});
  const { values, errorFor, register, onSubmit: onFieldsSubmit } = useFormFields(
    { fullName: "", email: "", password: "", confirmPassword: "" },
    validateSignup,
    state,
  );

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [consentAttempted, setConsentAttempted] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);

  const consentError =
    (!acceptedTerms && consentAttempted ? CONSENT_ERROR : undefined) ??
    (!acceptedTerms ? state.fieldErrors?.acceptedTerms : undefined);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    onFieldsSubmit(event);
    if (event.defaultPrevented) return;
    if (!acceptedTerms) {
      event.preventDefault();
      setConsentAttempted(true);
      consentRef.current?.focus();
    }
  };

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormAlert message={isPending ? undefined : state.formError} />

      <FormField id="fullName" label="Full name" error={errorFor("fullName")}>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          maxLength={FULL_NAME_MAX_LENGTH}
          required
          aria-describedby={fieldDescribedBy("fullName")}
          {...register("fullName")}
        />
      </FormField>

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

      <div className="grid gap-1">
        <label
          htmlFor="acceptedTerms"
          className="flex cursor-pointer items-start gap-3 text-body-sm leading-relaxed text-foreground"
        >
          <input
            ref={consentRef}
            id="acceptedTerms"
            name="acceptedTerms"
            type="checkbox"
            value="on"
            checked={acceptedTerms}
            onChange={(event) => {
              const checked = event.target.checked;
              setAcceptedTerms(checked);
              if (checked) setConsentAttempted(false);
            }}
            required
            aria-required="true"
            aria-invalid={Boolean(consentError)}
            aria-describedby="acceptedTerms-error"
            className={cn(
              "mt-1 size-4 shrink-0 rounded border border-input accent-primary",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          />
          <span>
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkClass}
              onClick={(event) => event.stopPropagation()}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkClass}
              onClick={(event) => event.stopPropagation()}
            >
              Privacy Policy
            </a>
          </span>
        </label>
        <div id="acceptedTerms-error" aria-live="polite" className="empty:hidden">
          {consentError ? (
            <p className="mt-1 text-label-sm text-destructive">{consentError}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
