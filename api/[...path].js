const routes = {
  "admin/backup": "../api-handlers/admin/backup",
  "admin/coupons": "../api-handlers/admin/coupons",
  availability: "../api-handlers/availability",
  "book-with-package": "../api-handlers/book-with-package",
  "booking-config": "../api-handlers/booking-config",
  "checkout-quote": "../api-handlers/checkout-quote",
  "checkout-status": "../api-handlers/checkout-status",
  "create-stripe-session": "../api-handlers/create-stripe-session",
  "manage-appointment": "../api-handlers/manage-appointment",
  "package-checkout": "../api-handlers/package-checkout",
  "payment-complete": "../api-handlers/payment-complete",
  "resolve-package": "../api-handlers/resolve-package",
  "validate-package": "../api-handlers/validate-package",
  "webhooks/acuity": "../api-handlers/webhooks/acuity",
  "webhooks/stripe": "../api-handlers/webhooks/stripe"
};
const { sendJson } = require("../lib/http");

function routePath(req) {
  const value = req.query?.path;
  return Array.isArray(value) ? value.join("/") : String(value || "");
}

module.exports = async function handler(req, res) {
  const handlerPath = routes[routePath(req)];
  if (!handlerPath) return sendJson(req, res, 404, { ok: false, error: "API route not found." });
  return require(handlerPath)(req, res);
};
