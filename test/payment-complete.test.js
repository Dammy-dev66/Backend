const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPaymentCompleteUrl } = require("../api/payment-complete");

test("buildPaymentCompleteUrl returns the booking return bridge", () => {
  const url = buildPaymentCompleteUrl(
    {
      subject: "AP Psychology",
      format: "oneToOne",
      tier: "pack6",
      appointmentTypeID: "95402039",
      email: "student@example.com",
      productID: "2253280",
      backUrl: "https://carrd.example",
      orderID: "ORD-1",
      couponCode: "FIN10",
      certificateCreated: true,
      totalPrice: 238,
      datetime: "2026-09-01T14:00:00+01:00",
      source: "mock-payment"
    },
    "https://backend-ymlj.vercel.app"
  );

  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/return.html");
  assert.equal(parsed.searchParams.get("subject"), "AP Psychology");
  assert.equal(parsed.searchParams.get("tier"), "pack6");
  assert.equal(parsed.searchParams.get("couponCode"), "FIN10");
  assert.equal(parsed.searchParams.get("totalPrice"), "238");
  assert.equal(parsed.searchParams.get("productID"), "2253280");
  assert.equal(parsed.searchParams.get("datetime"), "2026-09-01T14:00:00+01:00");
  assert.equal(parsed.searchParams.get("certificateCreated"), "1");
  assert.equal(parsed.searchParams.get("source"), "mock-payment");
});
