const { getStripeClient } = require("../lib/stripe");
const { handleOptions, readJson, resolveBaseOrigin, sendJson } = require("../lib/http");
const { buildPaymentCompleteUrl } = require("./payment-complete");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(body, field) {
  const value = cleanString(body[field]);
  if (!value) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const sessionID = requiredString(body, "session_id");
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionID);

    if (!session || session.payment_status !== "paid") {
      return sendJson(req, res, 400, { ok: false, error: "That payment has not completed yet." });
    }

    const metadata = session.metadata || {};
    const subject = cleanString(body.subject || metadata.subject);
    const format = cleanString(body.format || metadata.format);
    const tier = cleanString(body.tier || metadata.tier);
    const appointmentTypeID = cleanString(body.appointmentTypeID || metadata.appointmentTypeID);
    const email = cleanString(body.email || metadata.email);
    const productID = cleanString(body.productID || metadata.productID);
    const datetime = cleanString(body.datetime || metadata.datetime);
    const couponCode = cleanString(body.couponCode || metadata.couponCode);
    const backUrl = cleanString(body.backUrl || metadata.backUrl);
    const totalPrice = cleanString(body.totalPrice || metadata.totalPrice || session.amount_total / 100);
    const studentName2 = cleanString(body.studentName2 || metadata.studentName2);

    const url = buildPaymentCompleteUrl({
      subject,
      format,
      tier,
      appointmentTypeID,
      email,
      productID,
      backUrl,
      couponCode,
      appointmentCreated: false,
      certificateCreated: Boolean(productID),
      totalPrice,
      datetime,
      source: "stripe",
      sessionID,
      studentName2
    }, resolveBaseOrigin(req));

    return sendJson(req, res, 200, {
      ok: true,
      paymentVerified: true,
      url,
      kind: productID ? "package" : "booking"
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
