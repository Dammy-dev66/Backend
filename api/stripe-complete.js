const { createAppointment, createCertificate, extractCertificateCode } = require("../lib/acuity");
const { getStripeClient } = require("../lib/stripe");
const { handleOptions, readJson, resolveBaseOrigin, sendJson } = require("../lib/http");
const { buildPaymentCompleteUrl } = require("./payment-complete");
const { sendBookingConfirmationEmails } = require("../lib/receipt-email");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(body, field) {
  const value = cleanString(body[field]);
  if (!value) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const sessionID = requiredString(body, "session_id");
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionID);

    if (!session || session.payment_status !== "paid") {
      return sendJson(req, res, 400, { ok: false, error: "That payment has not completed yet." });
    }

    const metadata = session.metadata || {};
    const subject = cleanString(body.subject || metadata.subject);
    const format = cleanString(body.format || metadata.format);
    const tier = cleanString(body.tier || metadata.tier);
    const appointmentTypeID = cleanString(body.appointmentTypeID || metadata.appointmentTypeID);
    const email = cleanString(body.email || metadata.email);
    const productID = cleanString(body.productID || metadata.productID);
    const datetime = cleanString(body.datetime || metadata.datetime);
    const calendarID = cleanString(body.calendarID || metadata.calendarID);
    const firstName = cleanString(body.firstName || metadata.firstName);
    const lastName = cleanString(body.lastName || metadata.lastName);
    const phone = cleanString(body.phone || metadata.phone);
    const notes = cleanString(body.notes || metadata.notes);
    const timezone = cleanString(body.timezone || metadata.timezone);
    const studentName = cleanString(body.studentName || metadata.studentName);
    const studentName2 = cleanString(body.studentName2 || metadata.studentName2);
    const studentFieldID = cleanString(body.studentFieldID || metadata.studentFieldID);
    const couponCode = cleanString(body.couponCode || metadata.couponCode);
    const backUrl = cleanString(body.backUrl || metadata.backUrl);
    const orderID = cleanString(body.orderID || session.id);
    const totalPrice = cleanString(body.totalPrice || metadata.totalPrice || session.amount_total / 100);
    const acuityReady = process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY;
    let certificateCode = cleanString(body.certificate || metadata.certificate);

    let certificateCreated = false;
    let appointmentCreated = false;
    let receiptEmail = null;

    if (productID && email && acuityReady) {
      const certificateResponse = await createCertificate({
        productID,
        email
      });
      certificateCode = certificateCode || extractCertificateCode(certificateResponse);
      certificateCreated = true;
    }

    if (!productID && datetime && firstName && lastName && email && acuityReady) {
      const fields = [];
      if (studentName && studentFieldID) {
        const parsedFieldID = Number(studentFieldID);
        if (Number.isInteger(parsedFieldID)) {
          fields.push({ id: parsedFieldID, value: studentName });
        }
      }

      await createAppointment({
        datetime,
        appointmentTypeID: Number(appointmentTypeID),
        calendarID: calendarID ? Number(calendarID) : undefined,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        notes: notes || undefined,
        timezone: timezone || undefined,
        fields
      });
      appointmentCreated = true;

      receiptEmail = await sendBookingConfirmationEmails({
        customerEmail: email,
        copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
        origin: resolveBaseOrigin(req),
        subject,
        format,
        tier,
        appointmentTypeID,
        productID,
        certificate: certificateCode,
        orderID,
        backUrl,
        couponCode,
        totalPrice,
        recipientName: firstName || email
      });
    }

    const url = buildPaymentCompleteUrl({
      subject,
      format,
      tier,
      appointmentTypeID,
      email,
      productID,
      certificate: certificateCode,
      backUrl,
      orderID,
      couponCode,
      appointmentCreated,
      certificateCreated,
      totalPrice,
      datetime,
      source: "stripe",
      sessionID,
      studentName2
    }, resolveBaseOrigin(req));

    return sendJson(req, res, 200, {
      ok: true,
      url,
      certificateCreated,
      appointmentCreated,
      receiptEmail
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
