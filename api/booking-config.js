const { handleOptions, sendJson } = require("../lib/http");
const { enrichBookingConfig, readBookingConfig } = require("../lib/booking-config");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const config = enrichBookingConfig(await readBookingConfig());
    return sendJson(req, res, 200, {
      ok: true,
      version: config.version,
      subjects: config.subjects,
      services: config.services,
      serviceMap: config.serviceMap
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
