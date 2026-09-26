const { checkCertificate, listAppointments } = require("../../lib/acuity");
const { requireAdminKey, cleanString } = require("../../lib/admin-auth");
const { handleOptions, readJson, sendJson } = require("../../lib/http");
const { readBookingConfig } = require("../../lib/booking-config");
const { clientKey, readLedger, updateLedger, upsertPackage } = require("../../lib/operations-ledger");
const { clientSnapshot, historyStart, normalizeAppointment } = require("../../lib/operations");

function requireEmail(value) {
  const email = clientKey(value);
  if (!email || !email.includes("@")) {
    const error = new Error("A valid client email is required.");
    error.statusCode = 400;
    throw error;
  }
  return email;
}

async function refreshBalances(state, email) {
  const packages = state.packages.filter((item) => item.email === email && item.certificate && item.appointmentTypeID);
  for (const record of packages) {
    try {
      const balance = await checkCertificate({ certificate: record.certificate, appointmentTypeID: record.appointmentTypeID, email });
      const remaining = Number(balance?.remainingCounts?.[String(record.appointmentTypeID)] ?? balance?.remaining);
      if (Number.isFinite(remaining)) record.remaining = remaining;
      record.lastCheckedAt = new Date().toISOString();
    } catch (error) {
      record.balanceError = error.message;
      record.lastCheckedAt = new Date().toISOString();
    }
  }
  return state;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    requireAdminKey(req);
    if (req.method === "POST") {
      const body = await readJson(req);
      const email = requireEmail(body.email);
      const certificate = cleanString(body.certificate);
      const appointmentTypeID = cleanString(body.appointmentTypeID);
      if (!certificate || !appointmentTypeID) return sendJson(req, res, 400, { ok: false, error: "Package code and appointment type are required." });
      const ledger = await updateLedger((state) => upsertPackage(state, { ...body, email, certificate, appointmentTypeID, linkedManually: true }));
      return sendJson(req, res, 201, { ok: true, packages: ledger.packages.filter((item) => item.email === email) });
    }
    if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
    const email = requireEmail(req.query?.email);
    const config = await readBookingConfig();
    const rawAppointments = await listAppointments({ minDate: historyStart(), max: 100, showall: true, email });
    const ledger = await updateLedger((state) => refreshBalances(state, email));
    const appointments = (Array.isArray(rawAppointments) ? rawAppointments : []).map((item) => normalizeAppointment(item, config.services, ledger));
    return sendJson(req, res, 200, { ok: true, ...clientSnapshot(email, appointments, ledger) });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
