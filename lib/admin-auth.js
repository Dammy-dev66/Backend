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

  const provided = cleanString(req.headers["x-finbar-admin-key"]);
  if (!provided || provided !== configured) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

module.exports = { cleanString, requireAdminKey };
