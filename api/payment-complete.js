const { createAppointment, createCertificate } = require("../lib/acuity");
const { handleOptions, readJson, resolveBaseOrigin, resolvePublicOrigin, sendJson } = require("../lib/http");

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
  couponCode,
  appointmentCreated,
  certificateCreated,
  totalPrice,
  datetime,
  source
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
  if (couponCode) url.searchParams.set("couponCode", couponCode);
  if (datetime) url.searchParams.set("datetime", datetime);
  if (appointmentCreated) url.searchParams.set("appointmentCreated", "1");
  if (certificateCreated) url.searchParams.set("certificateCreated", "1");
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
    const datetime = cleanString(body.datetime);
    const calendarID = cleanString(body.calendarID);
    const firstName = cleanString(body.firstName);
    const lastName = cleanString(body.lastName);
    const phone = cleanString(body.phone);
    const notes = cleanString(body.notes);
    const timezone = cleanString(body.timezone);
    const studentName = cleanString(body.studentName);
    const studentFieldID = cleanString(body.studentFieldID);

    const acuityReady = process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY;
    let certificateCreated = false;
    let appointmentCreated = false;

    if (productID && email && acuityReady) {
      await createCertificate({
        productID,
        email
      });
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
    }

    const url = buildPaymentCompleteUrl({
      subject,
      format,
      tier,
      appointmentTypeID,
      email,
      productID,
      backUrl: cleanString(body.backUrl),
      orderID: cleanString(body.orderID),
      couponCode: cleanString(body.couponCode),
      appointmentCreated,
      certificateCreated,
      totalPrice: cleanString(body.totalPrice),
      datetime,
      source: cleanString(body.source)
    }, resolveBaseOrigin(req));

    return sendJson(req, res, 200, {
      ok: true,
      url,
      certificateCreated,
      certificateDeferred: !certificateCreated && Boolean(productID && email),
      appointmentCreated,
      appointmentDeferred: !appointmentCreated && Boolean(!productID && datetime && firstName && lastName && email)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};

module.exports.buildPaymentCompleteUrl = buildPaymentCompleteUrl;
