const test = require("node:test");
const assert = require("node:assert/strict");

const { packageExpiryAt, validityWeeks } = require("../lib/package-expiry");

test("all booking paths share the six, twelve, and twenty week limits", () => {
  const purchasedAt = "2026-03-22T10:30:00.000Z";
  for (const [tier, weeks] of Object.entries({ trial: 6, single: 6, pack6: 12, pack12: 20 })) {
    const expected = new Date(purchasedAt);
    expected.setUTCDate(expected.getUTCDate() + weeks * 7);
    assert.equal(validityWeeks(tier), weeks);
    assert.equal(packageExpiryAt({ tier, purchasedAt })?.toISOString(), expected.toISOString());
  }
});

test("unverified legacy and manually linked packages have no invented expiry", () => {
  assert.equal(validityWeeks("unknown"), null);
  assert.equal(packageExpiryAt({ tier: "unknown", purchasedAt: "2026-03-22T10:30:00Z" }), null);
  assert.equal(packageExpiryAt({ tier: "pack6", purchasedAt: "invalid" }), null);
  assert.equal(packageExpiryAt({ tier: "pack6", purchasedAt: "2026-03-22T10:30:00Z", linkedManually: true }), null);
});
