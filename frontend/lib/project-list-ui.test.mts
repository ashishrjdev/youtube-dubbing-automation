import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROJECT_LIST_EMPTY,
  PROJECT_LIST_ERROR,
  projectListView,
} from "./project-list-ui.ts";

describe("project-list-ui", () => {
  it("empty state copy includes title and New Project CTA", () => {
    assert.equal(PROJECT_LIST_EMPTY.title, "No projects yet — create your first one");
    assert.equal(PROJECT_LIST_EMPTY.ctaLabel, "New Project");
    assert.equal(PROJECT_LIST_EMPTY.ctaHref, "/projects/new");
    assert.ok(PROJECT_LIST_EMPTY.description.length > 0);
  });

  it("error state copy is user-facing with Try again (no raw errors)", () => {
    assert.equal(PROJECT_LIST_ERROR.role, "alert");
    assert.equal(PROJECT_LIST_ERROR.retryLabel, "Try again");
    assert.match(PROJECT_LIST_ERROR.message, /try again/i);
    assert.doesNotMatch(PROJECT_LIST_ERROR.message, /traceback|stack|status\s*\d{3}/i);
  });

  it("selects empty vs error vs list surfaces", () => {
    assert.equal(projectListView("loading", 0), "loading");
    assert.equal(projectListView("error", 5), "error");
    assert.equal(projectListView("ready", 0), "empty");
    assert.equal(projectListView("ready", 3), "list");
  });
});
