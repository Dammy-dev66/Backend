const { handleOptions, readJson, sendJson } = require("../lib/http");
const { applyCoupon, applyDiscount, couponAppliesToPackage, getCouponByCode } = require("../lib/coupons");
const { resolveBasePrice, resolvePackageLabel } = require("../lib/pricing");
const { readPriceState, resolvePriceFromState, policyVersion } = require("../lib/price-config");
const { findServiceForSelection, findSubjectBySelection, readBookingConfig } = require("../lib/booking-config");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCoupon(coupon) {
  return cleanString(coupon).toUpperCase();
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const format = cleanString(body.format);
    const tier = cleanString(body.tier);
    const requestedSubject = cleanString(body.subjectId) || cleanString(body.subject);
    const couponCode = normalizeCoupon(body.couponCode);

    const config = await readBookingConfig();
    const subject = findSubjectBySelection(config, requestedSubject);
    if (!subject) return sendJson(req, res, 400, { ok: false, error: "Choose an active subject before checking its price." });
    const service = findServiceForSelection(config, { subject: subject.id, format, tier });
    if (!service || !service.appointmentTypeID || String(service.appointmentTypeID) !== cleanString(body.appointmentTypeID) || String(service.productID || "") !== cleanString(body.productID)) {
      return sendJson(req, res, 409, { ok: false, error: "This lesson option has changed. Return to the booking page and select it again." });
    }
    const subjectId = subject.id;
    const subjectName = subject.name;

    const priceState = await readPriceState();
    const basePrice = resolvePriceFromState(priceState, subjectId, format, tier);
    if (basePrice === null) {
      return sendJson(req, res, 400, {
        ok: false,
        error: "Unknown package format or tier."
      });
    }

    const promo = couponCode ? await getCouponByCode(couponCode) : null;
    const packageKey = `${format}:${tier}`;
    const packageAllowed = !promo || couponAppliesToPackage(promo, format, tier);
    const applied = packageAllowed ? applyCoupon(basePrice, promo) : { discountAmount: 0, totalPrice: basePrice };
    const couponValid = !couponCode || (Boolean(promo) && packageAllowed);

    return sendJson(req, res, 200, {
      ok: true,
      currency: "EUR",
      subjectId,
      subjectName,
      basePrice,
      discountAmount: applied.discountAmount,
      totalPrice: applied.totalPrice,
      couponCode: couponCode || "",
      couponValid,
      couponMessage: packageAllowed ? (promo?.message || "") : "This coupon does not apply to the selected package.",
      packageKey,
      packageLabel: resolvePackageLabel(format, tier),
      policyText: priceState.popup.policyText,
      policyVersion: policyVersion(priceState.popup.policyText)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
module.exports.normalizeCoupon = normalizeCoupon;
module.exports.applyDiscount = applyDiscount;
module.exports.resolveBasePrice = resolveBasePrice;
