import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROJECT_STATUSES,
  isKnownProjectStatus,
  projectStatusPill,
} from "./project-status.ts";

describe("project-status", () => {
  it("covers every known backend status with a label and icon", () => {
    for (const status of PROJECT_STATUSES) {
      const pill = projectStatusPill(status);
      assert.ok(pill.label.length > 0, status);
      assert.ok(pill.icon, status);
      assert.ok(pill.variant, status);
    }
  });

  it("maps approved and voice_mapping to the same label", () => {
    assert.equal(projectStatusPill("approved").label, "Needs voice mapping");
    assert.equal(projectStatusPill("voice_mapping").label, "Needs voice mapping");
  });

  it("falls back to Unknown for unrecognized statuses", () => {
    assert.equal(isKnownProjectStatus("not_a_status"), false);
    const pill = projectStatusPill("not_a_status");
    assert.equal(pill.label, "Unknown");
    assert.equal(pill.variant, "outline");
  });
});
