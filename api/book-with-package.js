const { checkCertificate, createAppointment, resolvePackageCertificate } = require("../lib/acuity");
const { handleOptions, readJson, sendJson } = require("../lib/http");

const REQUIRED_STRING_FIELDS = ["datetime", "firstName", "lastName", "email"];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateBooking(body) {
  const missing = REQUIRED_STRING_FIELDS.filter((field) => !cleanString(body[field]));
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}.`);
    error.statusCode = 400;
    throw error;
  }

  const appointmentTypeID = Number(body.appointmentTypeID);
  if (!Number.isInteger(appointmentTypeID)) {
    const error = new Error("appointmentTypeID must be an integer.");
    error.statusCode = 400;
    throw error;
  }

  const calendarID = body.calendarID === undefined || body.calendarID === null || body.calendarID === ""
    ? undefined
    : Number(body.calendarID);

  if (calendarID !== undefined && !Number.isInteger(calendarID)) {
    const error = new Error("calendarID must be an integer when provided.");
    error.statusCode = 400;
    throw error;
  }

  return {
    datetime: cleanString(body.datetime),
    appointmentTypeID,
    calendarID,
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    email: cleanString(body.email),
    phone: cleanString(body.phone) || undefined,
    certificate: cleanString(body.certificate) || undefined,
    orderID: cleanString(body.orderID) || undefined,
    productID: cleanString(body.productID) || undefined,
    fields: Array.isArray(body.fields) ? body.fields : undefined,
    notes: cleanString(body.notes) || undefined,
    timezone: cleanString(body.timezone) || undefined
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const booking = validateBooking(await readJson(req));
    const resolved = booking.certificate
      ? { certificate: booking.certificate }
      : await resolvePackageCertificate({
        email: booking.email,
        appointmentTypeID: booking.appointmentTypeID,
        orderID: booking.orderID,
        productID: booking.productID
      });
    const certificate = resolved.certificate;

    await checkCertificate({
      certificate,
      appointmentTypeID: booking.appointmentTypeID,
      email: booking.email
    });

    const appointment = await createAppointment({
      ...booking,
      certificate
    });

    return sendJson(req, res, 201, {
      ok: true,
      paidByPackage: true,
      appointment
    });
  } catch (error) {
    const acuityError = error.acuity?.error;
    const noCredits = acuityError === "certificate_uses";
    const invalidPackage = [
      "invalid_certificate",
      "expired_certificate",
      "certificate_uses",
      "invalid_certificate_type"
    ].includes(acuityError);

    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      paidByPackage: false,
      canBookWithPackage: false,
      canFallbackToFullPrice: process.env.ALLOW_FULL_PRICE_FALLBACK === "true" && invalidPackage,
      noCredits,
      error: error.message,
      acuity: error.acuity
    });
  }
};
