const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");
const { PACKAGE_PRICES } = require("./pricing");

const BLOB_PATH = "finbar/pricing.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "pricing.json");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

function parseJson(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function readTextStream(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function defaultPriceState() {
  return {
    version: 1,
    currency: "EUR",
    prices: Object.fromEntries(Object.entries(PACKAGE_PRICES).map(([format, tiers]) => [format, { ...tiers }]))
  };
}

function normalizeAmount(value, fallback) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100000
    ? Math.round(amount * 100) / 100
    : fallback;
}

function normalizePriceState(value) {
  const fallback = defaultPriceState();
  return {
    version: 1,
    currency: "EUR",
    prices: Object.fromEntries(Object.entries(fallback.prices).map(([format, tiers]) => [
      format,
      Object.fromEntries(Object.entries(tiers).map(([tier, amount]) => [tier, normalizeAmount(value?.prices?.[format]?.[tier], amount)]))
    ]))
  };
}

async function readPriceState() {
  try {
    const blob = await get(BLOB_PATH, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      return normalizePriceState(parseJson(await readTextStream(blob.stream), defaultPriceState()));
    }
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Pricing storage is not connected in Vercel. Add Vercel Blob to manage prices.";
      error.statusCode = 503;
      throw error;
    }
  }

  try {
    return normalizePriceState(parseJson(await fs.readFile(LOCAL_PATH, "utf8"), defaultPriceState()));
  } catch {
    return defaultPriceState();
  }
}

async function writePriceState(state) {
  const normalized = normalizePriceState(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    await put(BLOB_PATH, serialized, { access: "private", contentType: "application/json", allowOverwrite: true });
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Pricing storage is not connected in Vercel. Add Vercel Blob to manage prices.";
      error.statusCode = 503;
      throw error;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

async function resolveConfiguredPrice(format, tier) {
  const state = await readPriceState();
  const value = state.prices?.[cleanString(format)]?.[cleanString(tier)];
  return Number.isFinite(value) ? value : null;
}

module.exports = {
  BLOB_PATH,
  defaultPriceState,
  normalizePriceState,
  readPriceState,
  resolveConfiguredPrice,
  writePriceState
};
