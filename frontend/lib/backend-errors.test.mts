import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BACKEND_SERVER_ERROR_MESSAGE,
  isBackendServerError,
  messageForBackendFailure,
} from "./backend-errors.ts";

describe("backend-errors", () => {
  it("maps 5xx to the friendly message without needing a body", () => {
    assert.equal(messageForBackendFailure({ status: 500 }), BACKEND_SERVER_ERROR_MESSAGE);
    assert.equal(messageForBackendFailure({ status: 502 }), BACKEND_SERVER_ERROR_MESSAGE);
    assert.equal(messageForBackendFailure({ status: 503 }), BACKEND_SERVER_ERROR_MESSAGE);
  });

  it("leaves 4xx to the caller", () => {
    assert.equal(messageForBackendFailure({ status: 400 }), undefined);
    assert.equal(messageForBackendFailure({ status: 401 }), undefined);
    assert.equal(messageForBackendFailure({ status: 404 }), undefined);
    assert.equal(messageForBackendFailure({ status: 422 }), undefined);
  });

  it("identifies server error statuses", () => {
    assert.equal(isBackendServerError(499), false);
    assert.equal(isBackendServerError(500), true);
  });
});
