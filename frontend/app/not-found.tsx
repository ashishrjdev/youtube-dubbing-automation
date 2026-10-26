import type { Metadata } from "next";

import { NotFoundIllustration } from "@/components/status-illustrations";
import { StatusPage } from "@/components/status-page";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * App-wide 404. Next.js returns HTTP 404 for this file automatically.
 *
 * Logged-out users hitting a protected prefix still go to /login via proxy.ts;
 * unknown URLs reach this page for everyone. "Back to Dashboard" → /dashboard
 * works for both: signed-in users land on the dashboard, signed-out users are
 * redirected to login by the proxy.
 */
export default function NotFound() {
  return (
    <StatusPage
      display="404"
      title="Page not found"
      description="That link doesn’t match anything here — it may have been moved or never existed."
      illustration={<NotFoundIllustration />}
      actions={
        <ButtonLink href="/dashboard" size="lg" className="w-full">
          Back to Dashboard
        </ButtonLink>
      }
    />
  );
}
