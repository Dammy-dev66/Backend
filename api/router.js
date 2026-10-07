const routes = {
  "admin/backup": () => require("../api-handlers/admin/backup"),
  "admin/coupons": () => require("../api-handlers/admin/coupons"),
  availability: () => require("../api-handlers/availability"),
  "book-with-package": () => require("../api-handlers/book-with-package"),
  "booking-config": () => require("../api-handlers/booking-config"),
  "checkout-quote": () => require("../api-handlers/checkout-quote"),
  "checkout-status": () => require("../api-handlers/checkout-status"),
  "create-stripe-session": () => require("../api-handlers/create-stripe-session"),
  "manage-appointment": () => require("../api-handlers/manage-appointment"),
  "package-checkout": () => require("../api-handlers/package-checkout"),
  "payment-complete": () => require("../api-handlers/payment-complete"),
  "resolve-package": () => require("../api-handlers/resolve-package"),
  "validate-package": () => require("../api-handlers/validate-package"),
  "webhooks/acuity": () => require("../api-handlers/webhooks/acuity"),
  "webhooks/stripe": () => require("../api-handlers/webhooks/stripe")
};
const { sendJson } = require("../lib/http");

function routePath(req) {
  const value = req.query?.path;
  return Array.isArray(value) ? value.join("/") : String(value || "");
}

module.exports = async function handler(req, res) {
  const loadHandler = routes[routePath(req)];
  if (!loadHandler) return sendJson(req, res, 404, { ok: false, error: "API route not found." });
  return loadHandler()(req, res);
};
