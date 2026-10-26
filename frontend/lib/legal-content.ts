/**
 * Pure helpers for the legal markdown files (LEGAL-01/02). No fs / Next
 * imports, so this module is unit-testable with `node --test`.
 *
 * Only the keys in LEGAL_CONFIG are substituted. Human-decision placeholders
 * such as {{VERIFY: ...}}, {{TRANSCRIPTION_PROVIDER}}, and
 * {{ERROR_TRACKING_NOTE}} are intentionally left in the text; callers detect
 * them with findPlaceholders().
 */
import { LEGAL_CONFIG } from "../content/legal/config.ts";

const PLACEHOLDER_RE = /\{\{[^{}]+\}\}/g;

export function substitutePlaceholders(source: string): string {
  return source.replace(PLACEHOLDER_RE, (match) => {
    const key = match.slice(2, -2).trim();
    return key in LEGAL_CONFIG
      ? LEGAL_CONFIG[key as keyof typeof LEGAL_CONFIG]
      : match;
  });
}

/** Every remaining {{...}} occurrence (after substitution, if applied). */
export function findPlaceholders(source: string): string[] {
  return [...source.matchAll(PLACEHOLDER_RE)].map((m) => m[0]);
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export type LegalHeading = { text: string; id: string };

export function extractHeadings(markdown: string): LegalHeading[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const text = line.slice(3).trim();
      return { text, id: slugifyHeading(text) };
    });
}

export function parseVersion(markdown: string): string {
  const match = markdown.match(/\*\*Version:\*\*\s*(\S+)/);
  return match ? match[1] : "unknown";
}

export function parseEffectiveDate(markdown: string): string {
  const match = markdown.match(/\*\*Effective date:\*\*\s*(.+)/);
  return match ? match[1].trim() : "";
}

export type LegalDocumentData = {
  /** Markdown after config substitution (human-decision placeholders remain). */
  markdown: string;
  version: string;
  effectiveDate: string;
  headings: LegalHeading[];
  unfilledPlaceholders: string[];
};

export function buildLegalDocument(rawMarkdown: string): LegalDocumentData {
  // Strip HTML comments (drafting notes like <!-- DRAFT: ... -->, not legal
  // text) so they never render or trip placeholder detection.
  const markdown = substitutePlaceholders(rawMarkdown).replace(/<!--[\s\S]*?-->/g, "");
  return {
    markdown,
    version: parseVersion(markdown),
    effectiveDate: parseEffectiveDate(markdown),
    headings: extractHeadings(markdown),
    unfilledPlaceholders: findPlaceholders(markdown),
  };
}

/**
 * Production guard: legal pages must not ship with unfilled placeholders.
 * Returns the list of problems (empty = OK). Only enforced when
 * ENVIRONMENT === "production"; see legal-content.test.mts.
 */
export function productionPlaceholderProblems(
  documents: Record<string, string>,
  environment: string | undefined,
): string[] {
  if (environment !== "production") return [];
  return Object.entries(documents).flatMap(([name, raw]) =>
    findPlaceholders(substitutePlaceholders(raw)).map(
      (placeholder) => `${name}: unfilled placeholder ${placeholder}`,
    ),
  );
}
