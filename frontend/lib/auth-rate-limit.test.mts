import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RATE_LIMIT_MESSAGE,
  isRateLimitError,
  rateLimitMessage,
} from "./auth-rate-limit.ts";

describe("isRateLimitError", () => {
  it("matches HTTP 429 regardless of code", () => {
    assert.equal(isRateLimitError({ status: 429 }), true);
    assert.equal(isRateLimitError({ status: 429, code: "anything" }), true);
  });

  it("matches over_request_rate_limit", () => {
    assert.equal(
      isRateLimitError({ status: 400, code: "over_request_rate_limit" }),
      true,
    );
  });

  it("matches over_email_send_rate_limit", () => {
    assert.equal(
      isRateLimitError({ status: 400, code: "over_email_send_rate_limit" }),
      true,
    );
  });

  it("does not match other errors", () => {
    assert.equal(isRateLimitError({ status: 400, code: "invalid_credentials" }), false);
    assert.equal(isRateLimitError({ status: 400, code: "weak_password" }), false);
    assert.equal(isRateLimitError({ status: 422, code: "email_address_invalid" }), false);
    assert.equal(isRateLimitError({ status: 500 }), false);
    assert.equal(isRateLimitError({}), false);
    assert.equal(isRateLimitError(null), false);
    assert.equal(isRateLimitError(undefined), false);
  });
});

describe("rateLimitMessage", () => {
  it("returns the shared message for 429 and each known code", () => {
    assert.equal(rateLimitMessage({ status: 429 }), RATE_LIMIT_MESSAGE);
    assert.equal(
      rateLimitMessage({ code: "over_request_rate_limit" }),
      RATE_LIMIT_MESSAGE,
    );
    assert.equal(
      rateLimitMessage({ code: "over_email_send_rate_limit" }),
      RATE_LIMIT_MESSAGE,
    );
  });

  it("returns null for non-rate-limit errors", () => {
    assert.equal(rateLimitMessage({ status: 400, code: "invalid_credentials" }), null);
    assert.equal(rateLimitMessage(null), null);
    assert.equal(rateLimitMessage(undefined), null);
  });

  it("shared message hardcodes no limit number", () => {
    assert.equal(/\d/.test(RATE_LIMIT_MESSAGE), false);
    assert.equal(
      RATE_LIMIT_MESSAGE,
      "Too many attempts, please try again in a few minutes.",
    );
  });
});
