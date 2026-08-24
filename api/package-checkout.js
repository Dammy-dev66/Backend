const { handleOptions, readJson, resolveBaseOrigin, resolvePublicOrigin, resolveConfiguredUrl, sendJson } = require("../lib/http");

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

function buildPackageCheckoutUrl({
  subject,
  format,
  tier,
  appointmentTypeID,
  productID,
  email,
  backUrl,
  source,
  datetime,
  calendarID,
  firstName,
  lastName,
  phone,
  studentName,
  studentFieldID,
  notes,
  timezone
}, baseOrigin, paymentUrl) {
  const canonicalOrigin = resolvePublicOrigin(baseOrigin || "https://backend-ymlj.vercel.app");
  const url = new URL("/checkout.html", canonicalOrigin);
  const returnUrl = new URL("/return.html", canonicalOrigin);
  ["subject", "format", "tier", "appointmentTypeID", "email", "backUrl"].forEach((key) => {
    if (key === "email" && email) returnUrl.searchParams.set("email", email);
    if (key === "backUrl" && backUrl) returnUrl.searchParams.set("backUrl", backUrl);
    if (key === "subject") returnUrl.searchParams.set("subject", subject);
    if (key === "format") returnUrl.searchParams.set("format", format);
    if (key === "tier") returnUrl.searchParams.set("tier", tier);
    if (key === "appointmentTypeID") returnUrl.searchParams.set("appointmentTypeID", appointmentTypeID);
  });
  if (source) returnUrl.searchParams.set("source", source);

  url.searchParams.set("subject", subject);
  url.searchParams.set("format", format);
  url.searchParams.set("tier", tier);
  url.searchParams.set("appointmentTypeID", appointmentTypeID);
  if (productID) url.searchParams.set("productID", productID);
  if (email) url.searchParams.set("email", email);
  if (backUrl) url.searchParams.set("backUrl", backUrl);
  url.searchParams.set("source", source || "custom-flow");
  if (datetime) url.searchParams.set("datetime", datetime);
  if (calendarID) url.searchParams.set("calendarID", calendarID);
  if (firstName) url.searchParams.set("firstName", firstName);
  if (lastName) url.searchParams.set("lastName", lastName);
  if (phone) url.searchParams.set("phone", phone);
  if (studentName) url.searchParams.set("studentName", studentName);
  if (studentFieldID) url.searchParams.set("studentFieldID", studentFieldID);
  if (notes) url.searchParams.set("notes", notes);
  if (timezone) url.searchParams.set("timezone", timezone);
  const checkoutUrl = url.toString();
  url.searchParams.set("returnUrl", returnUrl.toString());

  const effectivePaymentUrl = resolveConfiguredUrl(
    paymentUrl,
    canonicalOrigin,
    "/mock-payment.html"
  );

  const payment = new URL(effectivePaymentUrl);
  payment.searchParams.set("subject", subject);
  payment.searchParams.set("format", format);
  payment.searchParams.set("tier", tier);
  payment.searchParams.set("appointmentTypeID", appointmentTypeID);
  if (productID) payment.searchParams.set("productID", productID);
  if (email) payment.searchParams.set("email", email);
  if (backUrl) payment.searchParams.set("backUrl", backUrl);
  if (datetime) payment.searchParams.set("datetime", datetime);
  if (calendarID) payment.searchParams.set("calendarID", calendarID);
  if (firstName) payment.searchParams.set("firstName", firstName);
  if (lastName) payment.searchParams.set("lastName", lastName);
  if (phone) payment.searchParams.set("phone", phone);
  if (studentName) payment.searchParams.set("studentName", studentName);
  if (studentFieldID) payment.searchParams.set("studentFieldID", studentFieldID);
  if (notes) payment.searchParams.set("notes", notes);
  if (timezone) payment.searchParams.set("timezone", timezone);
  payment.searchParams.set("returnUrl", returnUrl.toString());
  payment.searchParams.set("cancelUrl", checkoutUrl);
  url.searchParams.set("paymentUrl", payment.toString());

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
    const url = buildPackageCheckoutUrl({
      subject,
      format,
      tier,
      appointmentTypeID,
      productID: cleanString(body.productID),
      email: cleanString(body.email),
      backUrl: cleanString(body.backUrl),
      source: cleanString(body.source),
      datetime: cleanString(body.datetime),
      calendarID: cleanString(body.calendarID),
      firstName: cleanString(body.firstName),
      lastName: cleanString(body.lastName),
      phone: cleanString(body.phone),
      studentName: cleanString(body.studentName),
      studentFieldID: cleanString(body.studentFieldID),
      notes: cleanString(body.notes),
      timezone: cleanString(body.timezone)
    }, resolveBaseOrigin(req), cleanString(process.env.CUSTOM_PAYMENT_URL));

    return sendJson(req, res, 200, { ok: true, url: url.toString() });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};

module.exports.buildPackageCheckoutUrl = buildPackageCheckoutUrl;
