const { checkCertificate, resolvePackageCertificate } = require("../lib/acuity");
const { handleOptions, readJson, sendJson } = require("../lib/http");
const { getStripeClient } = require("../lib/stripe");
const { isValidProfileToken } = require("../lib/package-profile");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveSavedProfile({ orderID, certificate, email, token }) {
  if (!orderID || !certificate || !email || !token) return null;
  if (!isValidProfileToken({ orderID, certificate, email, token })) return null;

  const session = await getStripeClient().checkout.sessions.retrieve(orderID);
  const metadata = session.metadata || {};
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid || cleanString(metadata.certificate) !== certificate || cleanString(metadata.email).toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  return {
    firstName: cleanString(metadata.firstName),
    lastName: cleanString(metadata.lastName),
    email,
    phone: cleanString(metadata.phone),
    studentName: cleanString(metadata.studentName),
    studentName2: cleanString(metadata.studentName2),
    notes: cleanString(metadata.notes)
  };
}

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
    const certificate = typeof body.certificate === "string" ? body.certificate.trim() : "";
    const email = certificate ? (typeof body.email === "string" ? body.email.trim() : "") : requireString(body, "email");
    const appointmentTypeID = Number(body.appointmentTypeID);

    if (!Number.isInteger(appointmentTypeID)) {
      return sendJson(req, res, 400, { ok: false, error: "appointmentTypeID must be an integer." });
    }

    const resolved = certificate
      ? {
          certificate,
          certificateStatus: await checkCertificate({ certificate, appointmentTypeID, email })
        }
      : await resolvePackageCertificate({
          email,
          appointmentTypeID,
          orderID: typeof body.orderID === "string" ? body.orderID.trim() : undefined,
          productID: typeof body.productID === "string" ? body.productID.trim() : undefined
        });

    const profile = await resolveSavedProfile({
      orderID: cleanString(body.orderID),
      certificate: resolved.certificate,
      email,
      token: cleanString(body.profileToken)
    });

    return sendJson(req, res, 200, {
      ok: true,
      packageValid: true,
      certificate: {
        ...resolved.certificateStatus,
        code: resolved.certificate
      },
      ...(profile ? { profile } : {})
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
