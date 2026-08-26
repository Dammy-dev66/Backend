const { createAppointment, createCertificate, extractCertificateCode } = require("../lib/acuity");
const { handleOptions, readJson, resolveBaseOrigin, resolvePublicOrigin, sendJson } = require("../lib/http");
const {
  sendPackageReceiptEmails,
  sendBookingConfirmationEmails
} = require("../lib/receipt-email");

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

function buildPaymentCompleteUrl({
  subject,
  format,
  tier,
  appointmentTypeID,
  email,
  productID,
  backUrl,
  orderID,
  certificate,
  couponCode,
  appointmentCreated,
  certificateCreated,
  totalPrice,
  datetime,
  source,
  sessionID,
  studentName2
}, baseOrigin) {
  const url = new URL("/return.html", resolvePublicOrigin(baseOrigin || "https://backend-ymlj.vercel.app"));
  url.searchParams.set("subject", subject);
  url.searchParams.set("format", format);
  url.searchParams.set("tier", tier);
  url.searchParams.set("appointmentTypeID", appointmentTypeID);
  if (email) url.searchParams.set("email", email);
  if (backUrl) url.searchParams.set("backUrl", backUrl);
  if (orderID) url.searchParams.set("orderID", orderID);
  if (productID) url.searchParams.set("productID", productID);
  if (certificate) url.searchParams.set("certificate", certificate);
  if (couponCode) url.searchParams.set("couponCode", couponCode);
  if (sessionID) url.searchParams.set("session_id", sessionID);
  if (datetime) url.searchParams.set("datetime", datetime);
  if (studentName2) url.searchParams.set("studentName2", studentName2);
  if (appointmentCreated) url.searchParams.set("appointmentCreated", "1");
  if (certificateCreated) url.searchParams.set("certificateCreated", "1");
  if (certificateCreated || productID) {
    url.searchParams.set("step", "2");
  } else if (appointmentCreated) {
    url.searchParams.set("step", "4");
  }
  if (totalPrice !== undefined && totalPrice !== null && totalPrice !== "") {
    url.searchParams.set("totalPrice", String(totalPrice));
  }
  url.searchParams.set("source", source || "custom-flow");
  return url.toString();
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
  const body = await readJson(req);
  const subject = requiredString(body, "subject");
  const format = requiredString(body, "format");
  const tier = requiredString(body, "tier");
  const appointmentTypeID = requiredString(body, "appointmentTypeID");
  const email = cleanString(body.email);
  const productID = cleanString(body.productID);
  const backUrl = cleanString(body.backUrl);
  const orderID = cleanString(body.orderID);
  const couponCode = cleanString(body.couponCode);
  const totalPrice = cleanString(body.totalPrice);
  let certificate = cleanString(body.certificate);
  const datetime = cleanString(body.datetime);
  const calendarID = cleanString(body.calendarID);
  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const phone = cleanString(body.phone);
    const notes = cleanString(body.notes);
    const timezone = cleanString(body.timezone);
    const studentName = cleanString(body.studentName);
    const studentName2 = cleanString(body.studentName2 || body.studentNameSecondary);
    const studentFieldID = cleanString(body.studentFieldID);

    const acuityReady = process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY;
    let certificateCreated = false;
    let appointmentCreated = false;

    if (productID && email && acuityReady) {
      const certificateResponse = await createCertificate({
        productID,
        email
      });
      const certificateCode = extractCertificateCode(certificateResponse);
      if (certificateCode) {
        certificate = certificateCode;
      }
      certificateCreated = true;
    }

    const combinedNotes = [
      notes,
      studentName2 ? `Student 2: ${studentName2}` : ""
    ].filter(Boolean).join("\n");

    let receiptEmail = null;
    if (productID && email) {
      receiptEmail = await sendPackageReceiptEmails({
        customerEmail: email,
        copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
        origin: resolveBaseOrigin(req),
        subject,
        format,
        tier,
        appointmentTypeID,
        productID,
        certificate,
        orderID,
        backUrl,
        couponCode,
        totalPrice,
        recipientName: firstName || email
      });
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
        notes: combinedNotes || undefined,
        timezone: timezone || undefined,
        fields
      });
      appointmentCreated = true;
      if (!productID && email) {
        receiptEmail = await sendBookingConfirmationEmails({
          customerEmail: email,
          copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
          origin: resolveBaseOrigin(req),
          subject,
          format,
          tier,
          appointmentTypeID,
          productID,
          certificate,
          orderID,
          backUrl,
          couponCode,
          totalPrice,
          recipientName: firstName || email
        });
      }
    }

    const url = buildPaymentCompleteUrl({
      subject,
      format,
      tier,
      appointmentTypeID,
      email,
      productID,
      backUrl,
      orderID,
      certificate,
      couponCode,
      appointmentCreated,
      certificateCreated,
      totalPrice,
      datetime,
      source: cleanString(body.source),
      sessionID: cleanString(body.sessionID),
      studentName2
    }, resolveBaseOrigin(req));

    return sendJson(req, res, 200, {
      ok: true,
      url,
      certificateCreated,
      certificate,
      certificateDeferred: !certificateCreated && Boolean(productID && email),
      appointmentCreated,
      appointmentDeferred: !appointmentCreated && Boolean(!productID && datetime && firstName && lastName && email),
      receiptEmail
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};

module.exports.buildPaymentCompleteUrl = buildPaymentCompleteUrl;
