import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { loadLegalDocument } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return <LegalDocument doc={loadLegalDocument("privacy")} />;
}
