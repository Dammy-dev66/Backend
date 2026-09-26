const { cancelAppointment, getAppointment, listAvailabilityTimes, rescheduleAppointment } = require("../../lib/acuity");
const { requireAdminKey, cleanString } = require("../../lib/admin-auth");
const { handleOptions, readJson, resolveBaseOrigin, sendJson } = require("../../lib/http");
const { readBookingConfig } = require("../../lib/booking-config");
const { readLedger, updateLedger, recordAction, recordAppointment, recordReceipt } = require("../../lib/operations-ledger");
const { normalizeAppointment } = require("../../lib/operations");
const { sendNotificationEmails } = require("../../lib/receipt-email");

function appointmentId(value) {
  const id = cleanString(value);
  if (!id) {
    const error = new Error("Appointment ID is required.");
    error.statusCode = 400;
    throw error;
  }
  return id;
}

function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Dublin" });
}

function serviceFor(config, appointment) {
  return config.services.find((service) => String(service.appointmentTypeID) === String(appointment.appointmentTypeID)) || {};
}

async function sendActionEmail({ kind, appointment, service, req, actionNote }) {
  return sendNotificationEmails({
    kind,
    templateKind: kind,
    customerEmail: appointment.email,
    copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
    origin: resolveBaseOrigin(req),
    subject: service.subjectName || appointment.type || "lesson",
    format: service.format,
    tier: service.tier,
    appointmentTypeID: appointment.appointmentTypeID,
    certificate: appointment.certificate,
    recipientName: appointment.firstName,
    bookingDate: dateOnly(appointment.datetime),
    actionNote: cleanString(actionNote),
    bookingStep: "1"
  });
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    requireAdminKey(req);
    const body = req.method === "GET" ? null : await readJson(req);
    const id = appointmentId(req.method === "GET" ? req.query?.id : body.appointmentId);
    const config = await readBookingConfig();
    if (req.method === "GET") {
      const date = cleanString(req.query?.date);
      if (!date) return sendJson(req, res, 400, { ok: false, error: "A date is required to load availability." });
      const appointment = await getAppointment(id);
      const times = await listAvailabilityTimes({ appointmentTypeID: appointment.appointmentTypeID, calendarID: appointment.calendarID, date, ignoreAppointmentID: id });
      return sendJson(req, res, 200, { ok: true, appointment: normalizeAppointment(appointment, config.services, await readLedger()), times: Array.isArray(times) ? times : [] });
    }
    if (req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
    const action = cleanString(body.action);
    const appointment = await getAppointment(id);
    const service = serviceFor(config, appointment);
    let updated = appointment;
    let email = null;
    if (action === "reschedule") {
      const datetime = cleanString(body.datetime);
      if (!datetime) return sendJson(req, res, 400, { ok: false, error: "Choose a new date and time first." });
      updated = await rescheduleAppointment(id, { datetime, calendarID: body.calendarID || appointment.calendarID });
      email = await sendActionEmail({ kind: "rescheduled", appointment: updated, service, req, actionNote: body.note });
    } else if (action === "cancel") {
      updated = await cancelAppointment(id, { cancelNote: cleanString(body.note) });
      email = await sendActionEmail({ kind: "canceled", appointment, service, req, actionNote: body.note });
    } else if (action === "resend") {
      email = await sendNotificationEmails({
        kind: "booking",
        templateKind: "booking",
        customerEmail: appointment.email,
        copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
        origin: resolveBaseOrigin(req),
        subject: service.subjectName || appointment.type || "lesson",
        format: service.format,
        tier: service.tier,
        appointmentTypeID: appointment.appointmentTypeID,
        certificate: appointment.certificate,
        recipientName: appointment.firstName,
        bookingDate: dateOnly(appointment.datetime),
        bookingStep: "1"
      });
    } else {
      return sendJson(req, res, 400, { ok: false, error: "Unknown appointment action." });
    }
    const ledger = await updateLedger((state) => {
      recordAppointment(state, { id, email: updated.email || appointment.email, subject: service.subjectName, datetime: updated.datetime || appointment.datetime, status: action === "cancel" ? "Canceled" : "Scheduled" });
      recordAction(state, { type: action, appointmentID: id, email: updated.email || appointment.email, note: cleanString(body.note), sent: email?.sent === true });
      recordReceipt(state, { kind: action === "resend" ? "booking" : action, appointmentID: id, email: updated.email || appointment.email, sent: email?.sent === true });
      return state;
    });
    return sendJson(req, res, 200, { ok: true, appointment: normalizeAppointment(updated, config.services, ledger), email });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
