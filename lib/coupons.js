const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");
const { listPackageKeys } = require("./pricing");

const BLOB_PATH = "finbar/coupons.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "coupons.json");

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(code) {
  return cleanString(code).toUpperCase();
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function defaultCouponState() {
  return {
    version: 1,
    coupons: []
  };
}

function normalizeCouponRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const code = normalizeCode(record.code);
  const percent = Number(record.percent);
  const packageKeys = Array.isArray(record.packageKeys)
    ? record.packageKeys.map(cleanString).filter(Boolean)
    : [];

  if (!code || !Number.isFinite(percent) || percent <= 0) {
    return null;
  }

  return {
    code,
    percent: Math.max(0, Math.min(100, percent)),
    label: cleanString(record.label) || `${percent}% off`,
    message: cleanString(record.message),
    packageKeys: packageKeys.length ? packageKeys : listPackageKeys(),
    active: record.active !== false
  };
}

function normalizeCouponState(value) {
  const coupons = Array.isArray(value?.coupons) ? value.coupons : [];
  return {
    version: Number(value?.version) || 1,
    coupons: coupons.map(normalizeCouponRecord).filter(Boolean)
  };
}

function mergeEnvCoupons(state) {
  const raw = cleanString(process.env.CUSTOM_PROMO_CODES);
  if (!raw) {
    return state;
  }

  const parsed = parseJson(raw, null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return state;
  }

  const envCoupons = Object.entries(parsed).map(([code, definition]) => normalizeCouponRecord({
    code,
    percent: definition?.percent ?? definition?.value,
    label: definition?.label,
    message: definition?.message,
    packageKeys: definition?.packageKeys,
    active: definition?.active
  })).filter(Boolean);

  const seen = new Set(state.coupons.map((coupon) => coupon.code));
  const merged = [...state.coupons];

  envCoupons.forEach((coupon) => {
    if (seen.has(coupon.code)) {
      return;
    }
    merged.push(coupon);
  });

  return { ...state, coupons: merged };
}

async function readTextStream(stream) {
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readCouponState() {
  try {
    const blob = await get(BLOB_PATH, {
      access: "private"
    });

    if (blob?.statusCode === 200 && blob.stream) {
      const raw = await readTextStream(blob.stream);
      return mergeEnvCoupons(normalizeCouponState(parseJson(raw, defaultCouponState())));
    }
  } catch (error) {
    if (isVercelRuntime()) {
      const message = "Coupon storage is not connected in Vercel. Add Vercel Blob to the project so the admin panel can save coupons.";
      const storageError = new Error(message);
      storageError.statusCode = 503;
      storageError.cause = error;
      throw storageError;
    }
  }

  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    return mergeEnvCoupons(normalizeCouponState(parseJson(raw, defaultCouponState())));
  } catch {
    return mergeEnvCoupons(normalizeCouponState(defaultCouponState()));
  }
}

async function writeCouponState(state) {
  const normalized = normalizeCouponState(state);
  const serialized = JSON.stringify(normalized, null, 2);

  try {
    await put(BLOB_PATH, serialized, {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true
    });
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      const message = "Coupon storage is not connected in Vercel. Add Vercel Blob to the project so the admin panel can save coupons.";
      const storageError = new Error(message);
      storageError.statusCode = 503;
      storageError.cause = error;
      throw storageError;
    }
  }

  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

function couponAppliesToPackage(coupon, format, tier) {
  if (!coupon || coupon.active === false) {
    return false;
  }

  const packageKey = `${format}:${tier}`;
  const packageKeys = Array.isArray(coupon.packageKeys) ? coupon.packageKeys : [];
  return packageKeys.includes(packageKey) || packageKeys.includes("*");
}

function applyCoupon(basePrice, coupon) {
  if (!coupon || coupon.active === false) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  const percent = Number(coupon.percent);
  if (!Number.isFinite(percent) || percent <= 0) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  const discountAmount = Math.min(basePrice, Math.max(0, Math.round((basePrice * Math.min(100, percent)) / 100)));
  return {
    discountAmount,
    totalPrice: Math.max(0, basePrice - discountAmount)
  };
}

function applyDiscount(basePrice, promo) {
  if (!promo) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  const type = cleanString(promo.type || promo.kind || "").toLowerCase();
  if (type === "percent" || Object.prototype.hasOwnProperty.call(promo, "percent")) {
    return applyCoupon(basePrice, {
      percent: Number(promo.percent ?? promo.value ?? promo.amount ?? 0),
      active: promo.active !== false
    });
  }

  const amount = Number(promo.amount ?? promo.value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { discountAmount: 0, totalPrice: basePrice };
  }

  const discountAmount = Math.min(basePrice, Math.max(0, Math.round(amount)));
  return {
    discountAmount,
    totalPrice: Math.max(0, basePrice - discountAmount)
  };
}

async function getCouponByCode(code) {
  const state = await readCouponState();
  const normalized = normalizeCode(code);
  return state.coupons.find((coupon) => coupon.code === normalized) || null;
}

module.exports = {
  BLOB_PATH,
  LOCAL_PATH,
  applyCoupon,
  applyDiscount,
  couponAppliesToPackage,
  defaultCouponState,
  getCouponByCode,
  mergeEnvCoupons,
  normalizeCode,
  normalizeCouponRecord,
  normalizeCouponState,
  readCouponState,
  writeCouponState
};
