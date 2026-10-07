const Stripe = require("stripe");
const { isProductionRuntime } = require("./runtime-scope");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getStripeClient() {
  const secretKey = cleanString(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    const error = new Error("Stripe is not connected yet. Set STRIPE_SECRET_KEY in Vercel.");
    error.statusCode = 503;
    throw error;
  }

  if (!isProductionRuntime() && /^(sk|rk)_live_/.test(secretKey)) {
    const error = new Error("Live Stripe payments are disabled outside the production deployment. Configure a Stripe test key for preview and development.");
    error.statusCode = 503;
    throw error;
  }

  return new Stripe(secretKey);
}

function assertStripeEventMode(event) {
  if (typeof event?.livemode !== "boolean") return;
  const secretKey = cleanString(process.env.STRIPE_SECRET_KEY);
  const keyIsLive = /^(sk|rk)_live_/.test(secretKey);
  if (event.livemode !== keyIsLive) {
    const error = new Error("Stripe webhook mode does not match the configured Stripe API key.");
    error.statusCode = 400;
    throw error;
  }
}

function isSessionPaid(session) {
  return session?.payment_status === "paid" ||
    (session?.payment_status === "no_payment_required" && Number(session.amount_total) === 0);
}

module.exports = {
  getStripeClient,
  assertStripeEventMode,
  isSessionPaid
};
