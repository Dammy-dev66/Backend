const { getStripeClient } = require("../lib/stripe");
const { handleOptions, readJson, sendJson } = require("../lib/http");
const { isValidProfileToken } = require("../lib/package-profile");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const orderID = cleanString(body.orderID);
    const certificate = cleanString(body.certificate);
    const email = cleanString(body.email).toLowerCase();
    const token = cleanString(body.token);

    if (!orderID || !certificate || !email || !token) {
      return sendJson(req, res, 400, { ok: false, error: "A secure package link is required." });
    }

    if (!isValidProfileToken({ orderID, certificate, email, token })) {
      return sendJson(req, res, 403, { ok: false, error: "This package link is not valid." });
    }

    const session = await getStripeClient().checkout.sessions.retrieve(orderID);
    const metadata = session.metadata || {};
    const paid = session.payment_status === "paid" || session.status === "complete";

    if (!paid || cleanString(metadata.certificate) !== certificate || cleanString(metadata.email).toLowerCase() !== email) {
      return sendJson(req, res, 403, { ok: false, error: "This package link does not match the purchase." });
    }

    return sendJson(req, res, 200, {
      ok: true,
      profile: {
        firstName: cleanString(metadata.firstName),
        lastName: cleanString(metadata.lastName),
        email,
        phone: cleanString(metadata.phone),
        studentName: cleanString(metadata.studentName),
        studentName2: cleanString(metadata.studentName2),
        notes: cleanString(metadata.notes)
      }
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message || "We could not load the saved booking details."
    });
  }
};
