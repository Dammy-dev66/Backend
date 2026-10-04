const test = require("node:test");
const assert = require("node:assert/strict");

const { corsHeaders, resolveBaseOrigin, resolvePublicOrigin } = require("../lib/http");

test("corsHeaders allows the live Carrd site without opening CORS to other origins", () => {
  const carrdHeaders = corsHeaders({ headers: { origin: "https://finbrady.carrd.co" } });
  const otherHeaders = corsHeaders({ headers: { origin: "https://untrusted.example" } });

  assert.equal(carrdHeaders["Access-Control-Allow-Origin"], "https://finbrady.carrd.co");
  assert.equal(carrdHeaders["Access-Control-Allow-Methods"], "GET, POST, PUT, OPTIONS");
  assert.equal(otherHeaders["Access-Control-Allow-Origin"], undefined);
});

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

test("resolveBaseOrigin ignores loopback origins for live URLs", () => {
  const original = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = "http://localhost:4174,https://carrd.example";

  assert.equal(resolveBaseOrigin({ headers: { origin: "http://localhost:4174" } }), "https://carrd.example");
  assert.equal(resolveBaseOrigin({ headers: { origin: "http://127.0.0.1:4174" } }), "https://carrd.example");

  process.env.ALLOWED_ORIGINS = original;
});

test("resolvePublicOrigin prefers an explicit non-loopback public origin", () => {
  const originalPublic = process.env.PUBLIC_SITE_ORIGIN;
  const originalAllowed = process.env.ALLOWED_ORIGINS;
  process.env.PUBLIC_SITE_ORIGIN = "http://localhost:4174";
  process.env.ALLOWED_ORIGINS = "https://carrd.example,https://custom.example";

  assert.equal(resolvePublicOrigin(), "https://carrd.example");

  process.env.PUBLIC_SITE_ORIGIN = "https://frontend.example";
  assert.equal(resolvePublicOrigin(), "https://frontend.example");

  process.env.PUBLIC_SITE_ORIGIN = originalPublic;
  process.env.ALLOWED_ORIGINS = originalAllowed;
});
