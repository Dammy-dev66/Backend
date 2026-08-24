const Stripe = require("stripe");

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

  return new Stripe(secretKey);
}

module.exports = {
  getStripeClient
};
