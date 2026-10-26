import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildLegalDocument,
  extractHeadings,
  findPlaceholders,
  productionPlaceholderProblems,
  slugifyHeading,
  substitutePlaceholders,
} from "./legal-content.ts";

function readLegal(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../content/legal/${name}.md`, import.meta.url)),
    "utf8",
  );
}

describe("substitutePlaceholders", () => {
  it("substitutes config values", () => {
    const out = substitutePlaceholders("Welcome to {{APP_NAME}}. Contact {{CONTACT_EMAIL}}.");
    assert.match(out, /VoiceFlow/);
    assert.match(out, /you@example\.com/);
    assert.doesNotMatch(out, /\{\{APP_NAME\}\}|\{\{CONTACT_EMAIL\}\}/);
  });

  it("leaves human-decision placeholders untouched", () => {
    const input =
      "{{TRANSCRIPTION_PROVIDER}} {{VERIFY: check this}} {{ERROR_TRACKING_NOTE}} {{ANALYTICS_NOTE}} {{DELETION_NOTE}} {{TRANSFER_NOTE}} {{HOSTING_PROVIDERS}} {{EMAIL_PROVIDER}} {{ERROR_TRACKING_PROVIDER}}";
    assert.equal(substitutePlaceholders(input), input);
  });
});

describe("legal files", () => {
  it("config placeholders are substituted in both files", () => {
    for (const name of ["terms", "privacy"]) {
      const doc = buildLegalDocument(readLegal(name));
      for (const key of [
        "APP_NAME",
        "OWNER_NAME",
        "CONTACT_EMAIL",
        "MINIMUM_AGE",
        "JURISDICTION",
        "EFFECTIVE_DATE",
      ]) {
        assert.ok(
          !doc.unfilledPlaceholders.includes(`{{${key}}}`),
          `${name}.md still has {{${key}}}`,
        );
      }
      assert.notEqual(doc.version, "unknown", `${name}.md has a Version`);
      assert.ok(doc.effectiveDate.length > 0, `${name}.md has an Effective date`);
      assert.ok(doc.headings.length > 0, `${name}.md has ## headings`);
    }
  });

  // The production guard: this fails the suite if a legal file still has an
  // unfilled placeholder when the suite runs with ENVIRONMENT=production.
  // Locally (ENVIRONMENT unset/development) the draft placeholders are
  // expected, so the same check is asserted to *detect* them instead.
  it("fails if a legal file contains an unfilled placeholder in production", () => {
    const documents = { terms: readLegal("terms"), privacy: readLegal("privacy") };
    const problems = productionPlaceholderProblems(documents, process.env.ENVIRONMENT);
    assert.deepEqual(problems, []);
  });

  it("detects the drafts' remaining placeholders", () => {
    const problems = productionPlaceholderProblems(
      { terms: readLegal("terms"), privacy: readLegal("privacy") },
      "production",
    );
    assert.ok(problems.length > 0, "draft files should still trip the production guard");
  });
});

describe("headings", () => {
  it("slugifies and extracts ## headings", () => {
    assert.equal(slugifyHeading("1. Who we are"), "1-who-we-are");
    assert.deepEqual(extractHeadings("# T\n\n## 4. Who processes your data\n"), [
      { text: "4. Who processes your data", id: "4-who-processes-your-data" },
    ]);
    assert.deepEqual(findPlaceholders("a {{X}} b"), ["{{X}}"]);
  });
});
