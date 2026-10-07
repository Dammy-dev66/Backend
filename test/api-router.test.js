const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../api/[...path]");

function response() {
  return {
    headers: {},
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

test("API router dispatches a catch-all route and preserves its query", async () => {
  const res = response();
  await router({
    method: "GET",
    url: "/api/checkout-status?session_id=bad",
    query: { path: ["checkout-status"], session_id: "bad" },
    headers: {}
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body, /valid checkout session/);
});

test("API router rejects unknown paths", async () => {
  const res = response();
  await router({ method: "GET", query: { path: ["admin", "missing"] }, headers: {} }, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.body, /API route not found/);
});
