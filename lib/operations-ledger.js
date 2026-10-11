const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");
const { cleanString } = require("./admin-auth");
const { conditionalBlobWrite } = require("./conditional-blob-write");
const { isMissingBlob } = require("./blob-errors");
const { scopedBlobPath } = require("./runtime-scope");

const BLOB_PATH = scopedBlobPath("finbar/operations-ledger.json");
const LOCAL_PATH = path.join(process.cwd(), "data", "operations-ledger.json");

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

function clientKey(email) { return cleanString(email).toLowerCase(); }
function identifier(value) { return typeof value === "number" && Number.isFinite(value) ? String(value) : cleanString(value); }
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
  return { version: 1, packages: [], receipts: [], appointments: [], actions: [], stripeEvents: [], policySnapshots: [], lastBackfillAt: "", backfillVersion: 0, stripeBackfillCursor: "", backfillError: "" };
}

function normalizeReceipt(record) {
  const item = record && typeof record === "object" ? record : {};
  const isStripeBackfill = item.kind === "package" && item.orderID && item.id === `package:${item.orderID}`;
  if (isStripeBackfill) return { ...item, sent: null, deliveryStatus: "unknown" };
  const deliveryStatus = cleanString(item.deliveryStatus) || (item.sent === true ? "sent" : item.sent === false ? "failed" : "unknown");
  const sent = deliveryStatus === "accepted" || deliveryStatus === "unknown"
    ? null
    : typeof item.sent === "boolean" ? item.sent : null;
  return {
    ...item,
    sent,
    deliveryStatus
  };
}

function receiptDeliveryFields(result) {
  const deliveryStatus = cleanString(result?.deliveryStatus) || (result?.sent === true ? "sent" : result?.accepted === true ? "accepted" : result?.skipped ? "unknown" : "failed");
  return {
    sent: deliveryStatus === "sent" ? true : deliveryStatus === "failed" ? false : null,
    deliveryStatus
  };
}

function normalizeLedger(value) {
  const state = value && typeof value === "object" ? value : {};
  return {
    version: 1,
    packages: Array.isArray(state.packages) ? state.packages : [],
    receipts: Array.isArray(state.receipts) ? state.receipts.map(normalizeReceipt) : [],
    appointments: Array.isArray(state.appointments) ? state.appointments : [],
    actions: Array.isArray(state.actions) ? state.actions.slice(0, 500) : [],
    stripeEvents: Array.isArray(state.stripeEvents) ? state.stripeEvents.slice(0, 500) : [],
    policySnapshots: Array.isArray(state.policySnapshots) ? state.policySnapshots.slice(0, 500) : [],
    lastBackfillAt: cleanString(state.lastBackfillAt),
    backfillVersion: Number.isInteger(Number(state.backfillVersion)) ? Number(state.backfillVersion) : 0,
    stripeBackfillCursor: cleanString(state.stripeBackfillCursor),
    backfillError: cleanString(state.backfillError)
  };
}

async function readLedger() {
  try {
    const blob = await get(BLOB_PATH, { access: "private", useCache: false });
    if (blob?.statusCode === 200 && blob.stream) {
      const state = normalizeLedger(parseJson(await readTextStream(blob.stream), defaultLedger()));
      state._revision = blob.blob?.etag || "";
      return state;
    }
  } catch (error) {
    if (isVercelRuntime()) {
      if (isMissingBlob(error)) {
        const state = defaultLedger();
        state._revision = "";
        return state;
      }
      error.message = "Operations storage is not connected in Vercel. Add Vercel Blob to use the operations dashboard.";
      error.statusCode = 503;
      throw error;
    }
  }
  try { return normalizeLedger(parseJson(await fs.readFile(LOCAL_PATH, "utf8"), defaultLedger())); } catch { return defaultLedger(); }
}

async function writeLedger(state) {
  const expectedEtag = cleanString(state?._revision);
  const normalized = normalizeLedger(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    const saved = await conditionalBlobWrite(BLOB_PATH, serialized, { contentType: "application/json", expectedEtag });
    normalized._revision = saved.etag || "";
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      if (error.statusCode === 409) throw error;
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await readLedger();
    const before = JSON.stringify(normalizeLedger(state));
    const updated = await mutator(state) || state;
    if (JSON.stringify(normalizeLedger(updated)) === before) return state;
    try {
      return await writeLedger(updated);
    } catch (error) {
      if (error.statusCode !== 409 || attempt === 2) throw error;
    }
  }
  return readLedger();
}

function upsertPackage(state, record) {
  const email = clientKey(record.email);
  const certificate = cleanString(record.certificate);
  const id = certificate || cleanString(record.orderID) || `${email}:${cleanString(record.productID)}`;
  if (!email || !id) return state;
  const index = state.packages.findIndex((item) => item.id === id || (certificate && item.certificate === certificate));
  const existing = index >= 0 ? state.packages[index] : {};
  const manuallyLinked = record.linkedManually === true && !cleanString(existing.purchasedAt);
  const next = {
    ...existing,
    id,
    email,
    certificate: cleanString(record.certificate) || cleanString(existing.certificate),
    orderID: cleanString(record.orderID) || cleanString(existing.orderID),
    productID: cleanString(record.productID) || cleanString(existing.productID),
    appointmentTypeID: identifier(record.appointmentTypeID) || identifier(existing.appointmentTypeID),
    subject: cleanString(record.subject) || cleanString(existing.subject),
    subjectId: cleanString(record.subjectId) || cleanString(existing.subjectId),
    format: cleanString(record.format) || cleanString(existing.format),
    tier: cleanString(record.tier) || cleanString(existing.tier),
    purchasedAt: cleanString(record.purchasedAt) || cleanString(existing.purchasedAt) || (record.linkedManually === true ? "" : now()),
    stripePaymentIntentId: cleanString(record.stripePaymentIntentId) || cleanString(existing.stripePaymentIntentId),
    paidAmountMinor: Number.isFinite(Number(record.paidAmountMinor)) ? Number(record.paidAmountMinor) : existing.paidAmountMinor,
    currency: cleanString(record.currency).toUpperCase() || cleanString(existing.currency),
    linkedManually: manuallyLinked,
    policyVersion: cleanString(record.policyVersion) || cleanString(existing.policyVersion),
    policyText: cleanString(record.policyText) || cleanString(existing.policyText),
    policyAcceptedAt: cleanString(record.policyAcceptedAt) || cleanString(existing.policyAcceptedAt),
    remaining: Number.isFinite(Number(record.remaining)) ? Number(record.remaining) : existing.remaining,
    lastCheckedAt: cleanString(record.lastCheckedAt) || cleanString(existing.lastCheckedAt)
  };
  if (index >= 0) state.packages[index] = next; else state.packages.unshift(next);
  return state;
}

function recordReceipt(state, record) {
  const id = identifier(record.id) || `${cleanString(record.kind)}:${cleanString(record.orderID)}:${identifier(record.appointmentID)}:${Date.now()}`;
  const deliveryStatus = cleanString(record.deliveryStatus) || (record.sent === true ? "sent" : record.sent === false ? "failed" : "unknown");
  const sent = deliveryStatus === "accepted" || deliveryStatus === "unknown" ? null : typeof record.sent === "boolean" ? record.sent : null;
  const item = { id, email: clientKey(record.email), kind: cleanString(record.kind), orderID: cleanString(record.orderID), appointmentID: identifier(record.appointmentID), sent, deliveryStatus, createdAt: cleanString(record.createdAt) || now() };
  const index = state.receipts.findIndex((existing) => existing.id === id);
  if (index >= 0) state.receipts[index] = item; else state.receipts.unshift(item);
  state.receipts = state.receipts.slice(0, 500);
  return state;
}

function recordAppointment(state, record) {
  const id = identifier(record.id || record.appointmentID);
  if (!id) return state;
  const index = state.appointments.findIndex((item) => item.id === id);
  const existing = index >= 0 ? state.appointments[index] : {};
  const next = { ...existing, ...record, id, email: clientKey(record.email) };
  const comparable = (item) => {
    const { updatedAt, ...fields } = item;
    return JSON.stringify(fields);
  };
  if (index >= 0 && comparable(existing) === comparable(next)) return state;
  next.updatedAt = now();
  if (index >= 0) state.appointments[index] = next; else state.appointments.unshift(next);
  state.appointments = state.appointments.slice(0, 500);
  return state;
}

function recordAction(state, record) {
  const actionId = cleanString(record.actionId).slice(0, 120);
  const id = actionId || `${cleanString(record.type)}:${identifier(record.appointmentID)}:${Date.now()}`;
  const index = state.actions.findIndex((item) => item.id === id);
  const existing = index >= 0 ? state.actions[index] : {};
  if (index >= 0) state.actions.splice(index, 1);
  state.actions.unshift({
    ...existing,
    id,
    createdAt: existing.createdAt || now(),
    updatedAt: now(),
    actor: cleanString(record.actor) || "Fin",
    result: cleanString(record.result) || "completed",
    emailSent: record.emailSent === true,
    ...record
  });
  state.actions = state.actions.slice(0, 500);
  return state;
}

function recordStripeEvent(state, record) {
  const id = cleanString(record.id);
  if (!id) return state;
  const index = state.stripeEvents.findIndex((item) => item.id === id);
  const next = { ...(index >= 0 ? state.stripeEvents[index] : {}), ...record, id, updatedAt: now() };
  if (index >= 0) state.stripeEvents[index] = next;
  else state.stripeEvents.unshift(next);
  state.stripeEvents = state.stripeEvents.slice(0, 500);
  return state;
}

function recordPolicySnapshot(state, record) {
  const id = cleanString(record.id);
  if (!id) return state;
  const index = state.policySnapshots.findIndex((item) => item.id === id);
  const next = {
    ...(index >= 0 ? state.policySnapshots[index] : {}),
    id,
    policyVersion: cleanString(record.policyVersion),
    policyText: cleanString(record.policyText),
    acceptedAt: cleanString(record.acceptedAt),
    sessionId: cleanString(record.sessionId),
    status: index >= 0 && state.policySnapshots[index].status === "paid"
      ? "paid"
      : cleanString(record.status) || "pending",
    updatedAt: now()
  };
  if (index >= 0) state.policySnapshots[index] = next;
  else state.policySnapshots.unshift(next);
  state.policySnapshots = state.policySnapshots.slice(0, 500);
  return state;
}

module.exports = { BLOB_PATH, clientKey, defaultLedger, normalizeLedger, readLedger, writeLedger, updateLedger, upsertPackage, recordReceipt, receiptDeliveryFields, recordAppointment, recordAction, recordStripeEvent, recordPolicySnapshot };
