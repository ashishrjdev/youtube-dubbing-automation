"use client";

import { useState } from "react";

import { FormAlert } from "@/components/form-alert";
import { StatusPage } from "@/components/status-page";
import { Button } from "@/components/ui/button";
import { messageForBackendFailure } from "@/lib/backend-errors";

/**
 * Dev-only helper for LEGAL-04 verify step 6: call a backend 500 and show the
 * friendly inline message without printing the response body.
 *
 * Hits the API directly (not `useApiFetch`) so a missing session cannot trigger
 * the 401→logout side effect. Production callers still use
 * `messageForBackendFailure(response)` from `useApiFetch` results the same way.
 */
export function DebugApiErrorProbe() {
  const [message, setMessage] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const onProbe = async () => {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch("http://localhost:8000/debug/raise");
      // Never print or parse the 5xx body — it must not reach the UI.
      setMessage(messageForBackendFailure(response) ?? `Unexpected status ${response.status}`);
    } catch {
      setMessage(messageForBackendFailure({ status: 502 } as Response));
    } finally {
      setPending(false);
    }
  };

  return (
    <StatusPage
      title="Backend error probe"
      description="Development only. Triggers GET /debug/raise through the API helper."
      actions={
        <>
          <FormAlert message={message} />
          <Button type="button" size="lg" className="w-full" disabled={pending} onClick={onProbe}>
            {pending ? "Calling…" : "Call /debug/raise"}
          </Button>
        </>
      }
    />
  );
}
