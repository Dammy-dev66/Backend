const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { get, put } = require("@vercel/blob");
const { PACKAGE_PRICES } = require("./pricing");
const { conditionalBlobWrite } = require("./conditional-blob-write");
const { isMissingBlob } = require("./blob-errors");
const { scopedBlobPath } = require("./runtime-scope");

const BLOB_PATH = scopedBlobPath("finbar/pricing.json");
const LOCAL_PATH = path.join(process.cwd(), "data", "pricing.json");
const DEFAULT_POLICY_TEXT = [
  "1. More than 12 hours before a lesson: You may reschedule or cancel without a late-change charge. Contact Fin about a refund for a paid single lesson.",
  "2. Within 12 hours: If a class is rescheduled or cancelled, 50% of that lesson's paid value will be refunded. Contact Fin; refunds are processed manually. Package cancellations need a balance check.",
  "3. Expiry: Trial classes and single lessons expire 6 weeks after booking. 6-class packages expire 12 weeks after purchase; 12-class packages expire 20 weeks after purchase.",
  "4. Missed lesson: Fin waits 20 minutes. The full lesson fee remains payable; if already paid or redeemed, it is not charged a second time.",
  "5. Two students: If one student cannot attend, a recording of the lesson will be provided to that student."
].join("\n");

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
    version: 2,
    currency: "EUR",
    prices: Object.fromEntries(Object.entries(PACKAGE_PRICES).map(([format, tiers]) => [format, { ...tiers }])),
    subjectPrices: {},
    popup: {
      heading: "Choose a lesson format",
      packageNotes: { pack6: "", pack12: "" },
      policyText: DEFAULT_POLICY_TEXT
    }
  };
}

function normalizeAmount(value, fallback) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return fallback;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100000
    ? Math.round(amount * 100) / 100
    : fallback;
}

function validatePriceStateInput(value) {
  if (value?.subjectPrices !== undefined && (!value.subjectPrices || typeof value.subjectPrices !== "object" || Array.isArray(value.subjectPrices))) {
    const error = new Error("Subject prices must be a set of price tables.");
    error.statusCode = 400;
    throw error;
  }
  const matrices = [["Shared defaults", value?.prices]];
  if (value?.subjectPrices && typeof value.subjectPrices === "object" && !Array.isArray(value.subjectPrices)) {
    for (const [subjectId, matrix] of Object.entries(value.subjectPrices)) matrices.push([subjectId, matrix]);
  }
  for (const [label, matrix] of matrices) {
    for (const [format, tiers] of Object.entries(PACKAGE_PRICES)) {
      for (const tier of Object.keys(tiers)) {
        const raw = matrix?.[format]?.[tier];
        const numeric = typeof raw === "number" || (typeof raw === "string" && /^\d+(?:\.\d{1,2})?$/.test(raw.trim()));
        const amount = numeric ? Number(raw) : NaN;
        if (!Number.isFinite(amount) || amount < 0 || amount > 100000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
          const error = new Error(`Enter a valid price for ${label}: ${format} ${tier}.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }
  }
}

function policyVersion(value) {
  const text = cleanString(value);
  return text ? crypto.createHash("sha256").update(text).digest("hex").slice(0, 24) : "";
}

function normalizePriceState(value) {
  const fallback = defaultPriceState();
  const validPriceMatrix = (matrix, fallbackMatrix) => Object.fromEntries(Object.entries(fallbackMatrix).map(([format, tiers]) => [
    format,
    Object.fromEntries(Object.entries(tiers).map(([tier, amount]) => [tier, normalizeAmount(matrix?.[format]?.[tier], amount)]))
  ]));
  const subjectPrices = {};
  if (value?.subjectPrices && typeof value.subjectPrices === "object" && !Array.isArray(value.subjectPrices)) {
    for (const [subjectId, matrix] of Object.entries(value.subjectPrices)) {
      if (!cleanString(subjectId) || !matrix || typeof matrix !== "object" || Array.isArray(matrix)) continue;
      subjectPrices[subjectId] = validPriceMatrix(matrix, fallback.prices);
    }
  }
  const popup = value?.popup && typeof value.popup === "object" ? value.popup : {};
  return {
    version: 2,
    currency: "EUR",
    prices: validPriceMatrix(value?.prices, fallback.prices),
    subjectPrices,
    popup: {
      heading: cleanString(popup.heading).slice(0, 140) || fallback.popup.heading,
      packageNotes: {
        pack6: cleanString(popup.packageNotes?.pack6).slice(0, 120),
        pack12: cleanString(popup.packageNotes?.pack12).slice(0, 120)
      },
      policyText: cleanString(popup.policyText).slice(0, 1400) || fallback.popup.policyText
    }
  };
}

async function readPriceState() {
  try {
    const blob = await get(BLOB_PATH, { access: "private", useCache: false });
    if (blob?.statusCode === 200 && blob.stream) {
      const state = normalizePriceState(parseJson(await readTextStream(blob.stream), defaultPriceState()));
      state._revision = blob.blob?.etag || "";
      return state;
    }
  } catch (error) {
    if (isVercelRuntime()) {
      if (isMissingBlob(error)) {
        const state = defaultPriceState();
        state._revision = "";
        return state;
      }
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
  const expectedEtag = cleanString(state?._revision);
  const normalized = normalizePriceState(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    const saved = await conditionalBlobWrite(BLOB_PATH, serialized, { contentType: "application/json", expectedEtag });
    normalized._revision = saved.etag || "";
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      if (error.statusCode === 409) throw error;
      error.message = "Pricing storage is not connected in Vercel. Add Vercel Blob to manage prices.";
      error.statusCode = 503;
      throw error;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

function resolvePriceFromState(state, subjectId, format, tier) {
  const key = cleanString(subjectId);
  const value = (key && state.subjectPrices?.[key]?.[cleanString(format)]?.[cleanString(tier)]) ??
    state.prices?.[cleanString(format)]?.[cleanString(tier)];
  return Number.isFinite(value) ? value : null;
}

async function resolveConfiguredPrice(subjectId, format, tier) {
  if (tier === undefined) {
    tier = format;
    format = subjectId;
    subjectId = "";
  }
  const state = await readPriceState();
  return resolvePriceFromState(state, subjectId, format, tier);
}

module.exports = {
  BLOB_PATH,
  defaultPriceState,
  normalizePriceState,
  validatePriceStateInput,
  policyVersion,
  readPriceState,
  resolvePriceFromState,
  resolveConfiguredPrice,
  writePriceState
};
