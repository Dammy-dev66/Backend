const crypto = require("node:crypto");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdminKey(req) {
  const configured = cleanString(process.env.FINBAR_ADMIN_KEY);
  if (!configured) {
    const error = new Error("Admin access is not configured yet.");
    error.statusCode = 503;
    throw error;
  }

  const provided = cleanString(req.headers?.["x-finbar-admin-key"]);
  const configuredBytes = Buffer.from(configured);
  const providedBytes = Buffer.from(provided);
  if (!provided || configuredBytes.length !== providedBytes.length || !crypto.timingSafeEqual(configuredBytes, providedBytes)) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

module.exports = { cleanString, requireAdminKey };
