"use client";

import { CircleCheck } from "lucide-react";
import { useActionState } from "react";

import { FormAlert } from "@/components/form-alert";
import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormFields } from "@/hooks/use-form-fields";
import { updateProfile, type UpdateProfileState } from "@/lib/auth-actions";
import { FULL_NAME_MAX_LENGTH, validateFullName } from "@/lib/auth-validation";

const validate = ({ fullName }: { fullName: string }) => {
  const error = validateFullName(fullName);
  return error ? { fullName: error } : {};
};

export function ProfileForm({ fullName, email }: { fullName: string | null; email: string | null }) {
  const [state, formAction, isPending] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    {},
  );
  const { values, errorFor, register, onSubmit } = useFormFields(
    { fullName: fullName ?? "" },
    validate,
    state,
  );
  const unchanged = values.fullName.trim() === (fullName ?? "");

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

      <FormField
        id="email"
        label="Email address"
        hint="This is the email you log in with. It can't be changed yet."
      >
        <Input
          id="email"
          type="email"
          value={email ?? ""}
          readOnly
          aria-describedby={fieldDescribedBy("email", { hint: true })}
          className="bg-surface-container-low text-muted-foreground"
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending || unchanged}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <p
          aria-live="polite"
          className="flex items-center gap-1.5 text-body-sm text-emerald-700 empty:hidden"
        >
          {state.saved && !isPending && unchanged ? (
            <>
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              Saved
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
