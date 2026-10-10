import { MailWarning } from "lucide-react";

import { SHELL_CONTAINER } from "@/components/app-shell/shell-container";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { cn } from "@/lib/utils";

/** Shown on every app page while the signed-in user's email is unconfirmed. */
export function VerifyEmailBanner({ email }: { email: string | null }) {
  return (
    <div role="status" className="border-b border-tertiary-fixed bg-tertiary-fixed/60">
      <div
        className={cn(
          SHELL_CONTAINER,
          "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="flex items-start gap-3">
          <MailWarning className="mt-0.5 size-5 shrink-0 text-on-tertiary-fixed" aria-hidden="true" />
          <p className="text-body-sm text-on-tertiary-fixed">
            <span className="font-semibold">Please verify your email to create projects.</span>{" "}
            {email ? (
              <>
                We sent a link to <span className="font-medium break-words">{email}</span>.
              </>
            ) : null}
          </p>
        </div>
        <ResendVerificationForm compact className="shrink-0 pl-8 sm:pl-0" />
      </div>
    </div>
  );
}
