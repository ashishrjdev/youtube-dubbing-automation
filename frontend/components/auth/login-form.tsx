"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { signIn, type SignInState } from "@/lib/auth-actions";
import { validateLogin } from "@/lib/auth-validation";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(signIn, {});
  const { errorFor, register, onSubmit } = useFormFields(
    { email: "", password: "" },
    validateLogin,
    state,
  );

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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

      <FormField id="password" label="Password" error={errorFor("password")}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={fieldDescribedBy("password")}
          {...register("password")}
        />
      </FormField>

      <div className="text-label-sm">
        <TextLink href="/forgot-password">Forgot your password?</TextLink>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
