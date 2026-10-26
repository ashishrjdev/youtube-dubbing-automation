/**
 * Values substituted into content/legal/terms.md and privacy.md at render
 * time. This is the ONLY place to change them. Defaults for OWNER_NAME,
 * CONTACT_EMAIL, and JURISDICTION are deliberately fake — set real values
 * before launch (the pages still warn about the remaining human-decision
 * placeholders until those are resolved in the .md files themselves).
 */
export const LEGAL_CONFIG = {
  APP_NAME: "VoiceFlow",
  OWNER_NAME: "Your Name",
  CONTACT_EMAIL: "you@example.com",
  MINIMUM_AGE: "18",
  JURISDICTION: "Your Jurisdiction",
  EFFECTIVE_DATE: "January 1, 2026",
} as const;

export type LegalConfigKey = keyof typeof LEGAL_CONFIG;
