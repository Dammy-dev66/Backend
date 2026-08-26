const { getStripeClient } = require("../lib/stripe");
const { handleOptions, readJson, resolveBaseOrigin, resolvePublicOrigin, sendJson } = require("../lib/http");
const { applyCoupon, couponAppliesToPackage, getCouponByCode } = require("../lib/coupons");
const { resolveBasePrice, resolvePackageLabel } = require("../lib/pricing");

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

function cents(amount) {
  return Math.round(Number(amount) * 100);
}

function resolveMetadata(body) {
  return {
    subject: cleanString(body.subject),
    format: cleanString(body.format),
    tier: cleanString(body.tier),
    appointmentTypeID: cleanString(body.appointmentTypeID),
    productID: cleanString(body.productID),
    email: cleanString(body.email),
    backUrl: cleanString(body.backUrl),
    datetime: cleanString(body.datetime),
    calendarID: cleanString(body.calendarID),
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    phone: cleanString(body.phone),
    studentName: cleanString(body.studentName),
    studentName2: cleanString(body.studentName2),
    studentFieldID: cleanString(body.studentFieldID),
    notes: cleanString(body.notes),
    timezone: cleanString(body.timezone),
    couponCode: cleanString(body.couponCode),
    source: cleanString(body.source) || "custom-flow"
  };
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
    const metadata = resolveMetadata(body);

    const basePrice = resolveBasePrice(format, tier);
    if (basePrice === null) {
      return sendJson(req, res, 400, { ok: false, error: "Unknown package format or tier." });
    }

    const coupon = metadata.couponCode ? await getCouponByCode(metadata.couponCode) : null;
    if (metadata.couponCode && (!coupon || !couponAppliesToPackage(coupon, format, tier))) {
      return sendJson(req, res, 400, { ok: false, error: "That coupon does not apply to this package." });
    }

    const applied = applyCoupon(basePrice, coupon);
    const totalPrice = applied.totalPrice;
    const stripe = getStripeClient();
    const origin = resolvePublicOrigin(resolveBaseOrigin(req));
    const successUrl = new URL("/return.html", origin);

    successUrl.searchParams.set("subject", subject);
    successUrl.searchParams.set("format", format);
    successUrl.searchParams.set("tier", tier);
    successUrl.searchParams.set("appointmentTypeID", appointmentTypeID);
    if (metadata.email) successUrl.searchParams.set("email", metadata.email);
    if (metadata.backUrl) successUrl.searchParams.set("backUrl", metadata.backUrl);
    if (metadata.productID) successUrl.searchParams.set("productID", metadata.productID);
    if (metadata.datetime) successUrl.searchParams.set("datetime", metadata.datetime);
    if (metadata.couponCode) successUrl.searchParams.set("couponCode", metadata.couponCode);
    if (metadata.productID) successUrl.searchParams.set("step", "2");
    successUrl.searchParams.set("source", "stripe");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    if (metadata.studentName2) successUrl.searchParams.set("studentName2", metadata.studentName2);

    const cancelUrl = new URL("/checkout.html", origin);
    Object.entries({
      subject,
      format,
      tier,
      appointmentTypeID,
      email: metadata.email,
      backUrl: metadata.backUrl,
      productID: metadata.productID,
      datetime: metadata.datetime,
      calendarID: metadata.calendarID,
      firstName: metadata.firstName,
      lastName: metadata.lastName,
      phone: metadata.phone,
      studentName: metadata.studentName,
      studentName2: metadata.studentName2,
      studentFieldID: metadata.studentFieldID,
      notes: metadata.notes,
      timezone: metadata.timezone,
      couponCode: metadata.couponCode,
      source: metadata.source
    }).forEach(([key, value]) => {
      if (value) {
        cancelUrl.searchParams.set(key, value);
      }
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: cents(totalPrice),
            product_data: {
              name: `${subject} - ${resolvePackageLabel(format, tier)}`,
              description: metadata.couponCode
                ? `Coupon ${metadata.couponCode} applied`
                : "Custom package purchase"
            }
          }
        }
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: metadata.email || undefined,
      payment_intent_data: metadata.email
        ? {
            receipt_email: metadata.email
          }
        : undefined,
      metadata: {
        ...metadata,
        basePrice: String(basePrice),
        discountAmount: String(applied.discountAmount),
        totalPrice: String(totalPrice)
      }
    });

    return sendJson(req, res, 200, {
      ok: true,
      url: session.url,
      sessionId: session.id,
      totalPrice,
      discountAmount: applied.discountAmount,
      couponCode: metadata.couponCode || "",
      packageLabel: resolvePackageLabel(format, tier)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
