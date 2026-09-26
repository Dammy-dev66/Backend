const { getStripeClient } = require("../../lib/stripe");
const { listAppointments } = require("../../lib/acuity");
const { requireAdminKey, cleanString } = require("../../lib/admin-auth");
const { handleOptions, sendJson } = require("../../lib/http");
const { readBookingConfig } = require("../../lib/booking-config");
const { updateLedger, upsertPackage, recordAppointment, recordReceipt } = require("../../lib/operations-ledger");
const { buildOperationsSummary, historyStart, normalizeAppointment } = require("../../lib/operations");

async function backfillPackages(state) {
  if (state.lastBackfillAt) return state;
  try {
    const since = Math.floor(new Date(`${historyStart()}T00:00:00.000Z`).getTime() / 1000);
    const sessions = await getStripeClient().checkout.sessions.list({ limit: 100, created: { gte: since } });
    for (const session of sessions.data || []) {
      const metadata = session.metadata || {};
      if (!metadata.productID || !(metadata.email || session.customer_email || session.customer_details?.email)) continue;
      upsertPackage(state, {
        email: metadata.email || session.customer_email || session.customer_details?.email,
        certificate: metadata.certificate,
        orderID: metadata.orderID || session.id,
        productID: metadata.productID,
        appointmentTypeID: metadata.appointmentTypeID,
        subject: metadata.subject,
        format: metadata.format,
        tier: metadata.tier,
        purchasedAt: new Date(session.created * 1000).toISOString()
      });
      recordReceipt(state, {
        kind: "package",
        email: metadata.email || session.customer_email || session.customer_details?.email,
        orderID: metadata.orderID || session.id,
        sent: true,
        createdAt: new Date(session.created * 1000).toISOString()
      });
    }
  } catch {
    // The dashboard remains useful when Stripe history cannot be fetched.
  }
  state.lastBackfillAt = new Date().toISOString();
  return state;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    requireAdminKey(req);
    if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
    const config = await readBookingConfig();
    const rawAppointments = await listAppointments({ minDate: historyStart(), max: 100, showall: true });
    const ledger = await updateLedger(async (state) => {
      await backfillPackages(state);
      (Array.isArray(rawAppointments) ? rawAppointments : []).forEach((appointment) => {
        recordAppointment(state, {
          id: appointment.id,
          email: appointment.email,
          datetime: appointment.datetime,
          appointmentTypeID: appointment.appointmentTypeID,
          status: appointment.canceled || appointment.noShow ? "Canceled" : "Scheduled"
        });
      });
      return state;
    });
    const appointments = (Array.isArray(rawAppointments) ? rawAppointments : [])
      .map((item) => normalizeAppointment(item, config.services, ledger))
      .sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
    const query = cleanString(req.query?.q).toLowerCase();
    const filtered = query ? appointments.filter((item) => [item.clientName, item.email, item.subject, item.appointmentTypeName].some((value) => String(value).toLowerCase().includes(query))) : appointments;
    return sendJson(req, res, 200, { ok: true, appointments: filtered, summary: buildOperationsSummary(filtered), lastBackfillAt: ledger.lastBackfillAt });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
