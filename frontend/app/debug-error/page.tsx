import { notFound } from "next/navigation";

import { DebugApiErrorProbe } from "@/components/debug-api-error-probe";

/**
 * Development-only routes for LEGAL-04 verification.
 * - default: throws during render so `app/error.tsx` can be exercised
 * - ?mode=api: probes a backend 500 and shows the friendly client message
 *
 * In production this always returns the branded 404 (notFound).
 */
export default async function DebugErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { mode } = await searchParams;
  if (mode === "api") {
    return <DebugApiErrorProbe />;
  }

  throw new Error("Intentional debug render error (LEGAL-04)");
}
