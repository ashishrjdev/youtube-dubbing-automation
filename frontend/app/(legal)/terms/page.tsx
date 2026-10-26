import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { loadLegalDocument } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return <LegalDocument doc={loadLegalDocument("terms")} />;
}
