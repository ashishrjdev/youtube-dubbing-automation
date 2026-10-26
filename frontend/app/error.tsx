"use client";

import { useEffect } from "react";

import { ErrorIllustration } from "@/components/status-illustrations";
import { StatusPage } from "@/components/status-page";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { LEGAL_CONFIG } from "@/content/legal/config";

/**
 * Route error boundary (LEGAL-04). Never render error.message or a stack —
 * digests are safe to show; messages can leak internals in any environment.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the digest only — never log error.message (may contain internals).
    if (error.digest) {
      console.error("Route error digest:", error.digest);
    } else {
      console.error("Route error (no digest)");
    }
  }, [error.digest]);

  return (
    <StatusPage
      tone="danger"
      title="Something went wrong"
      description="This page couldn’t finish loading. Your other work is fine — try again, or go back to the dashboard."
      illustration={<ErrorIllustration />}
      contactEmail={LEGAL_CONFIG.CONTACT_EMAIL}
      reference={error.digest}
      actions={
        <>
          <Button
            type="button"
            size="lg"
            variant="destructive"
            className="w-full bg-destructive text-white hover:bg-[#93000a]"
            onClick={() => reset()}
          >
            Try again
          </Button>
          <p className="text-center text-body-sm">
            <TextLink href="/dashboard" variant="subtle" className="text-destructive hover:text-[#93000a]">
              Back to Dashboard
            </TextLink>
          </p>
        </>
      }
    />
  );
}
