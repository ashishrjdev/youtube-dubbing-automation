"use client";

import { useRef, useState, type FormEvent } from "react";

import type { FieldErrors } from "@/lib/auth-validation";

type FormValues = Record<string, string>;

/**
 * Client-side state for a Server Action form with inline validation:
 * - errors for a field appear once it's blurred (or on submit), then update live;
 * - invalid submits are blocked and focus moves to the first invalid field;
 * - a server-returned field error hides once that field is edited.
 */
export function useFormFields<T extends FormValues>(
  initial: T,
  validate: (values: T) => FieldErrors<T>,
  serverState: { fieldErrors?: FieldErrors<T> },
) {
  const fields = Object.keys(initial) as (keyof T)[];
  const [values, setValues] = useState<T>(initial);
  const [shown, setShown] = useState<Set<keyof T>>(new Set());
  const [seenState, setSeenState] = useState(serverState);
  const [editedSinceResponse, setEditedSinceResponse] = useState<Set<keyof T>>(new Set());
  if (serverState !== seenState) {
    setSeenState(serverState);
    setEditedSinceResponse(new Set());
  }
  const inputs = useRef<Partial<Record<keyof T, HTMLInputElement | null>>>({});

  const clientErrors = validate(values);

  const errorFor = (field: keyof T): string | undefined =>
    (shown.has(field) ? clientErrors[field] : undefined) ??
    (editedSinceResponse.has(field) ? undefined : serverState.fieldErrors?.[field]);

  /** Props to spread onto the field's <Input>. */
  const register = (field: keyof T) => ({
    ref: (el: HTMLInputElement | null) => {
      inputs.current[field] = el;
    },
    name: String(field),
    value: values[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      setEditedSinceResponse((prev) => new Set(prev).add(field));
    },
    onBlur: () => {
      if (values[field]) setShown((prev) => new Set(prev).add(field));
    },
    "aria-invalid": Boolean(errorFor(field)),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const errors = validate(values);
    const firstInvalid = fields.find((field) => errors[field]);
    if (!firstInvalid) return;
    event.preventDefault();
    setShown(new Set(fields));
    inputs.current[firstInvalid]?.focus();
  };

  return { values, errorFor, register, onSubmit };
}
