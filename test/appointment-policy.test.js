const test = require("node:test");
const assert = require("node:assert/strict");
const { LATE_CHANGE_WINDOW_MS, isWithinLateChangeWindow } = require("../lib/appointment-policy");

test("twelve-hour change boundary is identical for customer and dashboard actions", () => {
  const now = Date.parse("2026-10-06T12:00:00.000Z");
  assert.equal(isWithinLateChangeWindow(new Date(now + LATE_CHANGE_WINDOW_MS + 1).toISOString(), now), false);
  assert.equal(isWithinLateChangeWindow(new Date(now + LATE_CHANGE_WINDOW_MS).toISOString(), now), true);
  assert.equal(isWithinLateChangeWindow(new Date(now + 1).toISOString(), now), true);
  assert.equal(isWithinLateChangeWindow(new Date(now).toISOString(), now), false);
  assert.equal(isWithinLateChangeWindow(new Date(now - 1).toISOString(), now), false);
  assert.equal(isWithinLateChangeWindow("invalid", now), false);
});
