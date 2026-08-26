const { createAppointment, createCertificate, extractCertificateCode } = require("../../lib/acuity");
const { handleOptions, resolveBaseOrigin, sendJson } = require("../../lib/http");
const {
  sendPackageReceiptEmails,
  sendBookingConfirmationEmails
} = require("../../lib/receipt-email");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function combineNotes(notes, studentName2) {
  return [
    cleanString(notes),
    cleanString(studentName2) ? `Student 2: ${cleanString(studentName2)}` : ""
  ].filter(Boolean).join("\n");
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const rawBody = await readRawBody(req);
    let event = null;
    const stripeSignature = req.headers["stripe-signature"] || req.headers["Stripe-Signature"];
    const secret = cleanString(process.env.STRIPE_WEBHOOK_SECRET);

    if (secret) {
      const stripe = require("../../lib/stripe").getStripeClient();
      if (!stripeSignature) {
        return sendJson(req, res, 400, { ok: false, error: "Missing Stripe signature." });
      }

      event = stripe.webhooks.constructEvent(rawBody, stripeSignature, secret);
    } else {
      event = JSON.parse(rawBody || "{}");
    }

    if (event.type !== "checkout.session.completed") {
      return sendJson(req, res, 200, { ok: true, ignored: true, type: event.type || "" });
    }

    const session = event.data?.object || {};
    const metadata = session.metadata || {};
    const acuityReady = Boolean(process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY);
    const email = cleanString(metadata.email || session.customer_details?.email || session.customer_email);
    const productID = cleanString(metadata.productID);
    const subject = cleanString(metadata.subject);
    const format = cleanString(metadata.format);
    const tier = cleanString(metadata.tier);
    const appointmentTypeID = cleanString(metadata.appointmentTypeID);
    const firstName = cleanString(metadata.firstName || session.customer_details?.name || email);
    const lastName = cleanString(metadata.lastName);
    const phone = cleanString(metadata.phone);
    const notes = cleanString(metadata.notes);
    const timezone = cleanString(metadata.timezone);
    const studentName = cleanString(metadata.studentName);
    const studentName2 = cleanString(metadata.studentName2);
    const studentFieldID = cleanString(metadata.studentFieldID);
    const datetime = cleanString(metadata.datetime);
    const calendarID = cleanString(metadata.calendarID);
    const couponCode = cleanString(metadata.couponCode);
    const backUrl = cleanString(metadata.backUrl);
    const orderID = cleanString(metadata.orderID || session.id);
    const totalPrice = cleanString(metadata.totalPrice || session.amount_total / 100);
    let certificateCode = cleanString(metadata.certificate);
    let receiptEmail = null;
    let certificateCreated = false;
    let appointmentCreated = false;

    if (!email) {
      return sendJson(req, res, 200, {
        ok: true,
        ignored: true,
        reason: "Missing email metadata on completed checkout session."
      });
    }

    if (productID && acuityReady) {
      const certificateResponse = await createCertificate({
        productID,
        email
      });
      certificateCode = certificateCode || extractCertificateCode(certificateResponse);
      certificateCreated = true;
    }

    if (!productID && datetime && firstName && lastName && acuityReady) {
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
        notes: combineNotes(notes, studentName2) || undefined,
        timezone: timezone || undefined,
        fields
      });
      appointmentCreated = true;
    }

    const sendEmail = productID ? sendPackageReceiptEmails : sendBookingConfirmationEmails;
    receiptEmail = await sendEmail({
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
      recipientName: firstName
    });

    return sendJson(req, res, 200, {
      ok: true,
      handled: true,
      type: event.type,
      kind: productID ? "package" : "booking",
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
