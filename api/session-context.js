const { getStripeClient } = require("../lib/stripe");
const { handleOptions, sendJson } = require("../lib/http");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const sessionID = cleanString(req.query?.session_id);
    if (!sessionID) {
      return sendJson(req, res, 400, { ok: false, error: "session_id is required." });
    }

    const session = await getStripeClient().checkout.sessions.retrieve(sessionID);
    const metadata = session.metadata || {};
    const email = cleanString(session.customer_details?.email)
      || cleanString(session.customer_email)
      || cleanString(metadata.email);

    return sendJson(req, res, 200, {
      ok: true,
      email,
      subject: cleanString(metadata.subject),
      format: cleanString(metadata.format),
      tier: cleanString(metadata.tier),
      appointmentTypeID: cleanString(metadata.appointmentTypeID),
      productID: cleanString(metadata.productID),
      backUrl: cleanString(metadata.backUrl),
      couponCode: cleanString(metadata.couponCode)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
