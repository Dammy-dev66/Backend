const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveBaseOrigin } = require("../lib/http");

test("resolveBaseOrigin prefers an allowed request origin", () => {
  const original = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = "https://carrd.example,https://custom.example";

  const origin = resolveBaseOrigin({ headers: { origin: "https://custom.example" } });
  assert.equal(origin, "https://custom.example");

  process.env.ALLOWED_ORIGINS = original;
});

test("resolveBaseOrigin falls back to the first allowed origin or the backend default", () => {
  const original = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = "https://carrd.example";

  assert.equal(resolveBaseOrigin({ headers: { origin: "https://not-allowed.example" } }), "https://carrd.example");

  process.env.ALLOWED_ORIGINS = "";
  assert.equal(resolveBaseOrigin({ headers: {} }), "https://backend-ymlj.vercel.app");

  process.env.ALLOWED_ORIGINS = original;
});
