const test = require("node:test");
const assert = require("node:assert/strict");
const { isSessionPaid } = require("../lib/stripe");

const sessionId = "cs_test_checkout_123";

function response() {
  return { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(value) { this.body = String(value || ""); } };
}

function loadHandler({ paymentStatus = "paid", productID = "2253280", event = null, ledgerError = false } = {}) {
  const paths = {
    stripe: require.resolve("../lib/stripe"),
    ledger: require.resolve("../lib/operations-ledger"),
    handler: require.resolve("../api-handlers/checkout-status")
  };
  Object.values(paths).forEach((path) => delete require.cache[path]);
  let retrieved = 0;
  let ledgerReads = 0;
  require.cache[paths.stripe] = { exports: {
    isSessionPaid,
    getStripeClient: () => ({ checkout: { sessions: { retrieve: async (id) => {
      retrieved += 1;
      return {
        id,
        payment_status: paymentStatus,
        amount_total: 54000,
        currency: "eur",
        metadata: { productID, subject: "Literary Classics", format: "oneToTwo", tier: "pack6" }
      };
    } } } })
  } };
  require.cache[paths.ledger] = { exports: {
    readLedger: async () => {
      ledgerReads += 1;
      if (ledgerError) throw new Error("Storage unavailable");
      return { stripeEvents: event ? [{ id: `checkout-session:${sessionId}`, ...event }] : [] };
    }
  } };
  return { handler: require("../api-handlers/checkout-status"), calls: () => ({ retrieved, ledgerReads }) };
}

async function getStatus(handler, id = sessionId) {
  const req = { method: "GET", headers: {}, url: `/api/checkout-status?session_id=${encodeURIComponent(id)}` };
  const res = response();
  await handler(req, res);
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
}

test("checkout status rejects a missing or malformed session without calling Stripe", async () => {
  const { handler, calls } = loadHandler();
  const result = await getStatus(handler, "invalid");
  assert.equal(result.statusCode, 400);
  assert.deepEqual(calls(), { retrieved: 0, ledgerReads: 0 });
});

test("checkout status never presents an unpaid session as received", async () => {
  const { handler, calls } = loadHandler({ paymentStatus: "unpaid" });
  const result = await getStatus(handler);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paymentStatus, "unpaid");
  assert.equal(result.body.fulfillmentStatus, "not_started");
  assert.equal(calls().ledgerReads, 0);
});

test("paid session stays processing until the webhook records a real package", async () => {
  const { handler } = loadHandler();
  const result = await getStatus(handler);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paymentStatus, "paid");
  assert.equal(result.body.fulfillmentStatus, "processing");
  assert.equal(result.body.totalPrice, 540);
});

test("completed package status requires a certificate and reports email acceptance separately", async () => {
  const { handler } = loadHandler({ event: { status: "completed", certificate: "CERT-1", emailDeliveryStatus: "accepted" } });
  const result = await getStatus(handler);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.fulfillmentStatus, "completed");
  assert.equal(result.body.emailDeliveryStatus, "accepted");
  assert.equal(result.body.kind, "package");
  assert.equal(Object.hasOwn(result.body, "certificate"), false);
});

test("failed or incomplete fulfillment requires review, not a success message", async () => {
  const failed = await getStatus(loadHandler({ event: { status: "failed" } }).handler);
  assert.equal(failed.body.fulfillmentStatus, "needs_review");
  const incomplete = await getStatus(loadHandler({ productID: "", event: { status: "completed" } }).handler);
  assert.equal(incomplete.body.fulfillmentStatus, "needs_review");
});

test("storage failure preserves verified payment status but does not claim fulfillment", async () => {
  const { handler } = loadHandler({ ledgerError: true });
  const result = await getStatus(handler);
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.paymentStatus, "paid");
  assert.equal(result.body.fulfillmentStatus, "unknown");
});
