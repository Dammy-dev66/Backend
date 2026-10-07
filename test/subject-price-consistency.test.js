const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const priceConfig = require("../lib/price-config");

function response() {
  return { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(value) { this.body = String(value || ""); } };
}

async function post(handler, body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };
  const res = response();
  await handler(req, res);
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
}

test("subject override is the amount quoted and charged by Stripe", async () => {
  const paths = {
    price: require.resolve("../lib/price-config"),
    acuity: require.resolve("../lib/acuity"),
    stripe: require.resolve("../lib/stripe"),
    quote: require.resolve("../api/checkout-quote"),
    checkout: require.resolve("../api/create-stripe-session")
  };
  const state = priceConfig.defaultPriceState();
  state.subjectPrices["english-literature"] = {
    oneToTwo: { pack6: 540 }
  };
  const stripeCalls = [];
  Object.values(paths).forEach((path) => delete require.cache[path]);
  require.cache[paths.price] = { exports: {
    readPriceState: async () => state,
    resolvePriceFromState: priceConfig.resolvePriceFromState,
    policyVersion: priceConfig.policyVersion
  } };
  require.cache[paths.acuity] = { exports: {
    hasAcuityCredentials: () => true,
    listAvailabilityTimes: async () => []
  } };
  require.cache[paths.stripe] = { exports: {
    getStripeClient: () => ({ checkout: { sessions: { create: async (payload) => {
      stripeCalls.push(payload);
      return { id: "cs_test_subject", url: "https://stripe.example/session" };
    } } } })
  } };

  const selected = {
    subject: "English Literature",
    format: "oneToTwo",
    tier: "pack6",
    appointmentTypeID: "96938926",
    productID: "2260532"
  };
  const quote = await post(require("../api/checkout-quote"), selected);
  assert.equal(quote.statusCode, 200);
  assert.equal(quote.body.subjectId, "english-literature");
  assert.equal(quote.body.totalPrice, 540);

  const checkout = await post(require("../api/create-stripe-session"), {
    ...selected,
    email: "student@example.com",
    quotedTotalCents: Math.round(quote.body.totalPrice * 100)
  });
  assert.equal(checkout.statusCode, 200);
  assert.equal(checkout.body.totalPrice, quote.body.totalPrice);
  assert.equal(stripeCalls.length, 1);
  assert.equal(stripeCalls[0].line_items[0].price_data.unit_amount, 54000);
  assert.equal(stripeCalls[0].metadata.subjectId, "english-literature");
});
