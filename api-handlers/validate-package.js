const { checkCertificate } = require("../lib/acuity");
const { handleOptions, readJson, sendJson } = require("../lib/http");

function requireString(body, field) {
  if (typeof body[field] !== "string" || !body[field].trim()) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return body[field].trim();
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const certificate = requireString(body, "certificate");
    const email = requireString(body, "email");
    const appointmentTypeID = Number(body.appointmentTypeID);

    if (!Number.isInteger(appointmentTypeID)) {
      return sendJson(req, res, 400, { ok: false, error: "appointmentTypeID must be an integer." });
    }

    const certificateStatus = await checkCertificate({
      certificate,
      appointmentTypeID,
      email
    });

    return sendJson(req, res, 200, {
      ok: true,
      packageValid: true,
      certificate: certificateStatus
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      packageValid: false,
      error: error.message,
      acuity: error.acuity
    });
  }
};
