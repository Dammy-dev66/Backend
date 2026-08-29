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
  studentName2,
  studentFieldID,
  notes,
  timezone
}, baseOrigin) {
  const canonicalOrigin = resolvePublicOrigin(baseOrigin || "https://backend-ymlj.vercel.app");
  const url = new URL("/checkout.html", canonicalOrigin);
  const returnUrl = new URL("/return.html", canonicalOrigin);
  ["subject", "format", "tier", "appointmentTypeID", "email", "backUrl", "productID"].forEach((key) => {
    if (key === "email" && email) returnUrl.searchParams.set("email", email);
    if (key === "backUrl" && backUrl) returnUrl.searchParams.set("backUrl", backUrl);
    if (key === "subject") returnUrl.searchParams.set("subject", subject);
    if (key === "format") returnUrl.searchParams.set("format", format);
    if (key === "tier") returnUrl.searchParams.set("tier", tier);
    if (key === "appointmentTypeID") returnUrl.searchParams.set("appointmentTypeID", appointmentTypeID);
    if (key === "productID" && productID) returnUrl.searchParams.set("productID", productID);
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
  if (studentName2) url.searchParams.set("studentName2", studentName2);
  if (studentFieldID) url.searchParams.set("studentFieldID", studentFieldID);
  if (notes) url.searchParams.set("notes", notes);
  if (timezone) url.searchParams.set("timezone", timezone);
  url.searchParams.set("returnUrl", returnUrl.toString());

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
      studentName2: cleanString(body.studentName2),
      studentFieldID: cleanString(body.studentFieldID),
      notes: cleanString(body.notes),
      timezone: cleanString(body.timezone)
    }, resolveBaseOrigin(req));

    return sendJson(req, res, 200, { ok: true, url: url.toString() });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};

module.exports.buildPackageCheckoutUrl = buildPackageCheckoutUrl;
