const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");
const { cleanString } = require("./admin-auth");

const BLOB_PATH = "finbar/operations-ledger.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "operations-ledger.json");

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

function clientKey(email) { return cleanString(email).toLowerCase(); }
function now() { return new Date().toISOString(); }
function parseJson(raw, fallback) { try { return JSON.parse(raw); } catch { return fallback; } }

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

function defaultLedger() {
  return { version: 1, packages: [], receipts: [], appointments: [], actions: [], lastBackfillAt: "", backfillVersion: 0, stripeBackfillCursor: "" };
}

function normalizeLedger(value) {
  const state = value && typeof value === "object" ? value : {};
  return {
    version: 1,
    packages: Array.isArray(state.packages) ? state.packages : [],
    receipts: Array.isArray(state.receipts) ? state.receipts : [],
    appointments: Array.isArray(state.appointments) ? state.appointments : [],
    actions: Array.isArray(state.actions) ? state.actions.slice(-500) : [],
    lastBackfillAt: cleanString(state.lastBackfillAt),
    backfillVersion: Number.isInteger(Number(state.backfillVersion)) ? Number(state.backfillVersion) : 0,
    stripeBackfillCursor: cleanString(state.stripeBackfillCursor)
  };
}

async function readLedger() {
  try {
    const blob = await get(BLOB_PATH, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) return normalizeLedger(parseJson(await readTextStream(blob.stream), defaultLedger()));
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Operations storage is not connected in Vercel. Add Vercel Blob to use the operations dashboard.";
      error.statusCode = 503;
      throw error;
    }
  }
  try { return normalizeLedger(parseJson(await fs.readFile(LOCAL_PATH, "utf8"), defaultLedger())); } catch { return defaultLedger(); }
}

async function writeLedger(state) {
  const normalized = normalizeLedger(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    await put(BLOB_PATH, serialized, { access: "private", contentType: "application/json", allowOverwrite: true });
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Operations storage is not connected in Vercel. Add Vercel Blob to use the operations dashboard.";
      error.statusCode = 503;
      throw error;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

async function updateLedger(mutator) {
  const state = await readLedger();
  const updated = await mutator(state) || state;
  return writeLedger(updated);
}

function upsertPackage(state, record) {
  const email = clientKey(record.email);
  const certificate = cleanString(record.certificate);
  const id = certificate || cleanString(record.orderID) || `${email}:${cleanString(record.productID)}`;
  if (!email || !id) return state;
  const index = state.packages.findIndex((item) => item.id === id || (certificate && item.certificate === certificate));
  const next = {
    ...(index >= 0 ? state.packages[index] : {}),
    id,
    email,
    certificate,
    orderID: cleanString(record.orderID),
    productID: cleanString(record.productID),
    appointmentTypeID: cleanString(record.appointmentTypeID),
    subject: cleanString(record.subject),
    format: cleanString(record.format),
    tier: cleanString(record.tier),
    purchasedAt: cleanString(record.purchasedAt) || now(),
    linkedManually: record.linkedManually === true,
    remaining: Number.isFinite(Number(record.remaining)) ? Number(record.remaining) : undefined,
    lastCheckedAt: cleanString(record.lastCheckedAt)
  };
  if (index >= 0) state.packages[index] = next; else state.packages.unshift(next);
  return state;
}

function recordReceipt(state, record) {
  const id = cleanString(record.id) || `${cleanString(record.kind)}:${cleanString(record.orderID)}:${cleanString(record.appointmentID)}:${Date.now()}`;
  const item = { id, email: clientKey(record.email), kind: cleanString(record.kind), orderID: cleanString(record.orderID), appointmentID: cleanString(record.appointmentID), sent: record.sent === true, createdAt: cleanString(record.createdAt) || now() };
  const index = state.receipts.findIndex((existing) => existing.id === id);
  if (index >= 0) state.receipts[index] = item; else state.receipts.unshift(item);
  state.receipts = state.receipts.slice(0, 500);
  return state;
}

function recordAppointment(state, record) {
  const id = cleanString(record.id || record.appointmentID);
  if (!id) return state;
  const index = state.appointments.findIndex((item) => item.id === id);
  const next = { ...(index >= 0 ? state.appointments[index] : {}), ...record, id, email: clientKey(record.email), updatedAt: now() };
  if (index >= 0) state.appointments[index] = next; else state.appointments.unshift(next);
  state.appointments = state.appointments.slice(0, 500);
  return state;
}

function recordAction(state, record) {
  state.actions.unshift({
    id: `${cleanString(record.type)}:${cleanString(record.appointmentID)}:${Date.now()}`,
    createdAt: now(),
    actor: cleanString(record.actor) || "Fin",
    result: cleanString(record.result) || "completed",
    emailSent: record.emailSent === true,
    ...record
  });
  state.actions = state.actions.slice(0, 500);
  return state;
}

module.exports = { BLOB_PATH, clientKey, defaultLedger, normalizeLedger, readLedger, writeLedger, updateLedger, upsertPackage, recordReceipt, recordAppointment, recordAction };
