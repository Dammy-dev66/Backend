const { handleOptions, sendJson } = require("../../lib/http");
const { requireAdminKey } = require("../../lib/admin-auth");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    requireAdminKey(req);
    return sendJson(req, res, 200, { ok: true });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
