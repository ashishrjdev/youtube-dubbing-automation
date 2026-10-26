import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseVersion, substitutePlaceholders } from "./legal-content.ts";
import {
  CONSENT_ERROR,
  buildSignupConsentMetadata,
  prepareSignUp,
  validateAcceptedTerms,
  validateSignupWithConsent,
} from "./signup-consent.ts";

function versionOf(name: string): string {
  const raw = readFileSync(
    fileURLToPath(new URL(`../content/legal/${name}.md`, import.meta.url)),
    "utf8",
  );
  return parseVersion(substitutePlaceholders(raw));
}

const TERMS_VERSION = versionOf("terms");
const PRIVACY_VERSION = versionOf("privacy");

const validFields = {
  fullName: "Test User",
  email: "test@example.com",
  password: "Password1",
  confirmPassword: "Password1",
};

describe("validateAcceptedTerms", () => {
  it("rejects unchecked", () => {
    assert.equal(validateAcceptedTerms(false), CONSENT_ERROR);
  });
  it("accepts checked", () => {
    assert.equal(validateAcceptedTerms(true), undefined);
  });
});

describe("prepareSignUp", () => {
  it("does not proceed (would not call Supabase) when unchecked", () => {
    const result = prepareSignUp(
      { ...validFields, acceptedTerms: false },
      TERMS_VERSION,
      PRIVACY_VERSION,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.fieldErrors.acceptedTerms, CONSENT_ERROR);
  });

  it("proceeds with consent metadata when checked", () => {
    const at = "2026-10-26T12:00:00.000Z";
    const result = prepareSignUp(
      { ...validFields, acceptedTerms: true },
      TERMS_VERSION,
      PRIVACY_VERSION,
      at,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.metadata, {
      full_name: "Test User",
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      consent_accepted_at: at,
    });
  });

  it("versions sent are the current legal constants", () => {
    const meta = buildSignupConsentMetadata("A", TERMS_VERSION, PRIVACY_VERSION, "t");
    assert.equal(meta.terms_version, TERMS_VERSION);
    assert.equal(meta.privacy_version, PRIVACY_VERSION);
    assert.notEqual(TERMS_VERSION, "unknown");
    assert.notEqual(PRIVACY_VERSION, "unknown");
  });

  it("still validates other fields when consent is checked", () => {
    const result = prepareSignUp(
      { ...validFields, email: "", acceptedTerms: true },
      TERMS_VERSION,
      PRIVACY_VERSION,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.email);
    assert.equal(result.fieldErrors.acceptedTerms, undefined);
  });
});

describe("validateSignupWithConsent", () => {
  it("combines field and consent errors", () => {
    const errors = validateSignupWithConsent({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    });
    assert.ok(errors.fullName);
    assert.ok(errors.acceptedTerms);
  });
});
