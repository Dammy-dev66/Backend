const test = require("node:test");
const assert = require("node:assert/strict");
const { acuityCredentials } = require("../lib/acuity");
const { sendNotificationEmails } = require("../lib/receipt-email");
const { scopedBlobPath } = require("../lib/runtime-scope");
const { getStripeClient } = require("../lib/stripe");

test("preview never uses production Acuity, live Stripe, unscoped Blob, or customer email", async () => {
  const names = [
    "VERCEL_ENV", "STRIPE_SECRET_KEY", "ACUITY_USER_ID", "ACUITY_API_KEY",
    "ACUITY_PREVIEW_USER_ID", "ACUITY_PREVIEW_API_KEY",
    "MAKE_RECEIPT_WEBHOOK_URL", "PREVIEW_MAKE_RECEIPT_WEBHOOK_URL", "PREVIEW_EMAIL_RECIPIENT"
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const previousFetch = global.fetch;
  try {
    process.env.VERCEL_ENV = "preview";
    process.env.STRIPE_SECRET_KEY = "sk_live_should_not_be_used";
    process.env.ACUITY_USER_ID = "production-user";
    process.env.ACUITY_API_KEY = "production-key";
    delete process.env.ACUITY_PREVIEW_USER_ID;
    delete process.env.ACUITY_PREVIEW_API_KEY;
    process.env.MAKE_RECEIPT_WEBHOOK_URL = "https://make.example.test/live";
    delete process.env.PREVIEW_MAKE_RECEIPT_WEBHOOK_URL;
    delete process.env.PREVIEW_EMAIL_RECIPIENT;
    global.fetch = () => { throw new Error("Preview must not call the live email webhook."); };

    assert.throws(() => getStripeClient(), /Live Stripe payments are disabled/);
    assert.equal(acuityCredentials().userId, undefined);
    assert.equal(acuityCredentials().apiKey, undefined);
    assert.equal(scopedBlobPath("finbar/pricing.json"), "preview/finbar/pricing.json");
    const result = await sendNotificationEmails({ kind: "booking", customerEmail: "customer@example.com" });
    assert.equal(result.skipped, true);
    assert.equal(result.sent, false);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    global.fetch = previousFetch;
  }
});
