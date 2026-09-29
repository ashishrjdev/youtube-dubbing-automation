import { CircleAlert } from "lucide-react";

/** Form-level error. Always mounted so role="alert" announces new messages. */
export function FormAlert({ message }: { message?: string }) {
  return (
    <div role="alert" className="empty:hidden">
      {message ? (
        <p className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
}
