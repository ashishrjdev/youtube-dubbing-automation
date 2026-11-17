import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatAbsoluteTime, formatRelativeTime } from "./relative-time.ts";

describe("relative-time", () => {
  it("formats recent times relative to now", () => {
    const now = new Date("2026-11-17T12:00:00.000Z");
    const twoHoursAgo = new Date("2026-11-17T10:00:00.000Z");
    assert.equal(formatRelativeTime(twoHoursAgo, now, "en"), "2 hours ago");
  });

  it("formats absolute timestamps for tooltips", () => {
    const stamp = formatAbsoluteTime("2026-11-17T10:00:00.000Z", "en-US");
    assert.match(stamp, /2026/);
    assert.match(stamp, /:/);
  });

  it("returns empty string for invalid dates", () => {
    assert.equal(formatRelativeTime("not-a-date"), "");
    assert.equal(formatAbsoluteTime("not-a-date"), "");
  });
});
