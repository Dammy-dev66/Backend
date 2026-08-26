const { handleOptions, resolveBaseOrigin, sendJson } = require("../../lib/http");
const {
  sendPackageReceiptEmails,
  sendBookingConfirmationEmails
} = require("../../lib/receipt-email");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const rawBody = await readRawBody(req);
    let event = null;
    const stripeSignature = req.headers["stripe-signature"] || req.headers["Stripe-Signature"];
    const secret = cleanString(process.env.STRIPE_WEBHOOK_SECRET);

    if (secret) {
      const stripe = require("../../lib/stripe").getStripeClient();
      if (!stripeSignature) {
        return sendJson(req, res, 400, { ok: false, error: "Missing Stripe signature." });
      }

      event = stripe.webhooks.constructEvent(rawBody, stripeSignature, secret);
    } else {
      event = JSON.parse(rawBody || "{}");
    }

    if (event.type !== "checkout.session.completed") {
      return sendJson(req, res, 200, { ok: true, ignored: true, type: event.type || "" });
    }

    const session = event.data?.object || {};
    const metadata = session.metadata || {};
    const email = cleanString(metadata.email || session.customer_details?.email || session.customer_email);
    const productID = cleanString(metadata.productID);
    const firstName = cleanString(metadata.firstName || session.customer_details?.name || email);

    if (!email) {
      return sendJson(req, res, 200, {
        ok: true,
        ignored: true,
        reason: "Missing email metadata on completed checkout session."
      });
    }

    const emailKind = productID ? "package" : "booking";
    const sendEmail = productID ? sendPackageReceiptEmails : sendBookingConfirmationEmails;

    const receiptEmail = await sendEmail({
      customerEmail: email,
      copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
      origin: resolveBaseOrigin(req),
      subject: cleanString(metadata.subject),
      format: cleanString(metadata.format),
      tier: cleanString(metadata.tier),
      appointmentTypeID: cleanString(metadata.appointmentTypeID),
      productID,
      certificate: cleanString(metadata.certificate),
      orderID: cleanString(metadata.orderID || session.id),
      backUrl: cleanString(metadata.backUrl),
      couponCode: cleanString(metadata.couponCode),
      totalPrice: cleanString(metadata.totalPrice || session.amount_total / 100),
      recipientName: firstName
    });

    return sendJson(req, res, 200, {
      ok: true,
      handled: true,
      type: event.type,
      emailKind,
      receiptEmail
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
