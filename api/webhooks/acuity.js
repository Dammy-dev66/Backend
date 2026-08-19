const crypto = require("node:crypto");
const { sendJson } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  const expectedSignature = req.headers["x-acuity-signature"];
  const secret = process.env.ACUITY_API_KEY;

  if (expectedSignature && secret) {
    const actualSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

    if (actualSignature !== expectedSignature) {
      return sendJson(req, res, 401, { ok: false, error: "Invalid Acuity signature." });
    }
  }

  const parsed = Object.fromEntries(new URLSearchParams(rawBody));
  const event = Object.keys(parsed).length ? parsed : { rawBody };

  console.log("acuity.webhook", {
    receivedAt: new Date().toISOString(),
    kind: event.action === "order.completed" ? "package-order" : "appointment",
    event
  });

  return sendJson(req, res, 200, { ok: true });
};
