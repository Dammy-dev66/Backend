const { handleOptions, sendJson } = require("../lib/http");
const { getStripeClient, isSessionPaid } = require("../lib/stripe");
const { readLedger } = require("../lib/operations-ledger");
const { MEETING_PLATFORM } = require("../lib/meeting-platform");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sessionIdFrom(req) {
  if (req.query?.session_id) return cleanString(req.query.session_id);
  return cleanString(new URL(req.url || "/", "http://localhost").searchParams.get("session_id"));
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  res.setHeader?.("Cache-Control", "private, no-store");
  if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });

  const sessionId = sessionIdFrom(req);
  if (!/^cs_[A-Za-z0-9_-]{6,255}$/.test(sessionId)) {
    return sendJson(req, res, 400, { ok: false, error: "A valid checkout session is required." });
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (!session || session.id !== sessionId) throw new Error("Checkout session not found.");
    const paymentStatus = isSessionPaid(session) ? "paid" : "unpaid";
    const metadata = session.metadata || {};
    const details = {
      ok: true,
      paymentStatus,
      kind: cleanString(metadata.productID) ? "package" : "booking",
      subject: cleanString(metadata.subject),
      format: cleanString(metadata.format),
      tier: cleanString(metadata.tier),
      currency: cleanString(session.currency).toUpperCase() || "EUR",
      totalPrice: Number.isInteger(session.amount_total) ? session.amount_total / 100 : null
    };
    if (paymentStatus !== "paid") {
      return sendJson(req, res, 200, { ...details, fulfillmentStatus: "not_started" });
    }

    try {
      const ledger = await readLedger();
      const event = ledger.stripeEvents.find((item) => item.id === `checkout-session:${sessionId}`);
      const completedWithBooking = event?.status === "completed" && (details.kind === "package" ? Boolean(event.certificate) : Boolean(event.appointmentID));
      const fulfillmentStatus = completedWithBooking ? "completed" : event?.status === "failed" || event?.status === "completed" ? "needs_review" : "processing";
      return sendJson(req, res, 200, {
        ...details,
        fulfillmentStatus,
        emailDeliveryStatus: fulfillmentStatus === "completed" ? cleanString(event.emailDeliveryStatus) || "unknown" : "unknown",
        meetingPlatform: fulfillmentStatus === "completed" && details.kind === "booking" ? MEETING_PLATFORM : null
      });
    } catch {
      return sendJson(req, res, 503, {
        ...details,
        ok: false,
        fulfillmentStatus: "unknown",
        error: "Payment was received, but booking progress could not be checked. Contact Finbar before trying to pay again."
      });
    }
  } catch {
    return sendJson(req, res, 503, { ok: false, paymentStatus: "unknown", fulfillmentStatus: "unknown", error: "Payment status could not be verified. Contact Finbar before trying to pay again." });
  }
};
