const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = require("../package.json");

test("package.json exposes a testable Vercel Node project", () => {
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.engines.node, />=20/);
});
