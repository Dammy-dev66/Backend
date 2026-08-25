const { handleOptions, readJson, sendJson } = require("../lib/http");
const { applyCoupon, applyDiscount, couponAppliesToPackage, getCouponByCode } = require("../lib/coupons");
const { resolveBasePrice, resolvePackageLabel } = require("../lib/pricing");

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
    const couponCode = normalizeCoupon(body.couponCode);

    const basePrice = resolveBasePrice(format, tier);
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
      basePrice,
      discountAmount: applied.discountAmount,
      totalPrice: applied.totalPrice,
      couponCode: couponCode || "",
      couponValid,
      couponMessage: packageAllowed ? (promo?.message || "") : "This coupon does not apply to the selected package.",
      packageKey,
      packageLabel: resolvePackageLabel(format, tier)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
module.exports.resolveBasePrice = resolveBasePrice;
module.exports.normalizeCoupon = normalizeCoupon;
module.exports.applyDiscount = applyDiscount;
