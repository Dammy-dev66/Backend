const { handleOptions, readJson, sendJson } = require("../lib/http");

const PACKAGE_PRICES = {
  oneToOne: {
    trial: 25,
    single: 50,
    pack6: 264,
    pack12: 456
  },
  oneToTwo: {
    trial: 35,
    single: 70,
    pack6: 360,
    pack12: 648
  }
};

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readPromos() {
  const raw = cleanString(process.env.CUSTOM_PROMO_CODES);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to an empty promo map.
  }

  return {};
}

function normalizeCoupon(coupon) {
  return cleanString(coupon).toUpperCase();
}

function resolveBasePrice(format, tier) {
  const value = PACKAGE_PRICES[format]?.[tier];
  return Number.isFinite(value) ? value : null;
}

function resolvePromo(code) {
  const promos = readPromos();
  return promos[normalizeCoupon(code)] || null;
}

function applyDiscount(basePrice, promo) {
  if (!promo) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  const type = cleanString(promo.type || promo.kind || "amount").toLowerCase();
  const rawValue = Number(promo.value ?? promo.amount ?? promo.percent ?? 0);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  let discountAmount = 0;
  if (type === "percent") {
    discountAmount = Math.round((basePrice * rawValue) / 100);
  } else {
    discountAmount = Math.round(rawValue);
  }

  discountAmount = Math.min(basePrice, Math.max(0, discountAmount));
  return {
    discountAmount,
    totalPrice: Math.max(0, basePrice - discountAmount)
  };
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

    const promo = couponCode ? resolvePromo(couponCode) : null;
    const applied = applyDiscount(basePrice, promo);
    const couponValid = !couponCode || Boolean(promo);

    return sendJson(req, res, 200, {
      ok: true,
      currency: "EUR",
      basePrice,
      discountAmount: applied.discountAmount,
      totalPrice: applied.totalPrice,
      couponCode: couponCode || "",
      couponValid,
      couponMessage: promo?.label || promo?.message || ""
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};

module.exports.resolveBasePrice = resolveBasePrice;
module.exports.resolvePromo = resolvePromo;
module.exports.applyDiscount = applyDiscount;
