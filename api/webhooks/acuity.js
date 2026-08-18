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

  let event = {};
  try {
    event = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    event = { rawBody };
  }

  console.log("acuity.webhook", {
    receivedAt: new Date().toISOString(),
    event
  });

  return sendJson(req, res, 200, { ok: true });
};
