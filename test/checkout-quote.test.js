const test = require("node:test");
const assert = require("node:assert/strict");

const { applyDiscount, resolveBasePrice } = require("../api-handlers/checkout-quote");
const { Readable } = require("node:stream");
const quoteHandler = require("../api-handlers/checkout-quote");

async function requestQuote(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = {};
  const res = { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(value) { this.body = String(value || ""); } };
  await quoteHandler(req, res);
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
}

test("resolveBasePrice returns the configured package price", () => {
  assert.equal(resolveBasePrice("oneToOne", "pack6"), 264);
  assert.equal(resolveBasePrice("oneToTwo", "pack12"), 648);
  assert.equal(resolveBasePrice("bogus", "pack12"), null);
});

test("quote resolves legacy subject names to the same subject-specific price key", async () => {
  const response = await requestQuote({
    subject: "English Literature",
    format: "oneToTwo",
    tier: "pack6",
    appointmentTypeID: "96938926",
    productID: "2260532"
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.subjectId, "english-literature");
  assert.equal(response.body.subjectName, "Literary Classics");
  assert.equal(response.body.totalPrice, 360);
});

test("quote rejects an unknown subject or stale lesson mapping", async () => {
  const missing = await requestQuote({ format: "oneToTwo", tier: "pack6", appointmentTypeID: "96938926", productID: "2260532" });
  assert.equal(missing.statusCode, 400);
  const stale = await requestQuote({ subject: "English Literature", format: "oneToTwo", tier: "pack6", appointmentTypeID: "old-id", productID: "2260532" });
  assert.equal(stale.statusCode, 409);
});

test("applyDiscount clamps the discount and total cleanly", () => {
  assert.deepEqual(applyDiscount(100, { type: "percent", value: 25 }), {
    discountAmount: 25,
    totalPrice: 75
  });

  assert.deepEqual(applyDiscount(100, { type: "amount", value: 250 }), {
    discountAmount: 100,
    totalPrice: 0
  });
});

