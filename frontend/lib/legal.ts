import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildLegalDocument,
  parseVersion,
  substitutePlaceholders,
  type LegalDocumentData,
} from "@/lib/legal-content";

/**
 * Server-side loader for the legal markdown (LEGAL-01/02). LEGAL-05's signup
 * consent will record TERMS_VERSION / PRIVACY_VERSION, so they are read from
 * the files here — bump the Version line in the .md file and the recorded
 * version follows.
 */
function readLegalFile(name: "terms" | "privacy"): string {
  return readFileSync(join(process.cwd(), "content", "legal", `${name}.md`), "utf8");
}

export const TERMS_VERSION = parseVersion(substitutePlaceholders(readLegalFile("terms")));
export const PRIVACY_VERSION = parseVersion(
  substitutePlaceholders(readLegalFile("privacy")),
);

export function loadLegalDocument(name: "terms" | "privacy"): LegalDocumentData {
  const doc = buildLegalDocument(readLegalFile(name));
  if (doc.unfilledPlaceholders.length > 0 && process.env.NODE_ENV === "production") {
    // Placeholder names only — never log document content beyond that.
    console.warn(
      `legal/${name}.md still contains unfilled placeholders: ${doc.unfilledPlaceholders.join(", ")}`,
    );
  }
  return doc;
}
