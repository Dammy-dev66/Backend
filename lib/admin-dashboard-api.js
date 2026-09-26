const { getStripeClient } = require("./stripe");
const { cancelAppointment, checkCertificate, getAppointment, listAppointments, listAvailabilityTimes, rescheduleAppointment } = require("./acuity");
const { requireAdminKey, cleanString } = require("./admin-auth");
const { readJson, resolveBaseOrigin, sendJson } = require("./http");
const { readBookingConfig } = require("./booking-config");
const { clientKey, readLedger, updateLedger, upsertPackage, recordAction, recordAppointment, recordReceipt } = require("./operations-ledger");
const { buildOperationsSummary, clientSnapshot, historyStart, normalizeAppointment } = require("./operations");
const { defaultTemplates, normalizeTemplateState, readTemplateState, writeTemplateState } = require("./email-templates");
const { sendNotificationEmails } = require("./receipt-email");

function queryFor(req) {
  if (req.query && typeof req.query === "object") return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

function requireEmail(value) {
  const email = clientKey(value);
  if (!email || !email.includes("@")) {
    const error = new Error("A valid client email is required.");
    error.statusCode = 400;
    throw error;
  }
  return email;
}

function requireAppointmentId(value) {
  const id = cleanString(value);
  if (!id) {
    const error = new Error("Appointment ID is required.");
    error.statusCode = 400;
    throw error;
  }
  return id;
}

function readableDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Dublin" });
}

function serviceFor(config, appointment) {
  return config.services.find((service) => String(service.appointmentTypeID) === String(appointment.appointmentTypeID)) || {};
}

async function backfillPackages(state) {
  if (state.lastBackfillAt) return state;
  try {
    const since = Math.floor(new Date(`${historyStart()}T00:00:00.000Z`).getTime() / 1000);
    const sessions = await getStripeClient().checkout.sessions.list({ limit: 100, created: { gte: since } });
    for (const session of sessions.data || []) {
      const metadata = session.metadata || {};
      const email = metadata.email || session.customer_email || session.customer_details?.email;
      if (!metadata.productID || !email) continue;
      upsertPackage(state, {
        email,
        certificate: metadata.certificate,
        orderID: metadata.orderID || session.id,
        productID: metadata.productID,
        appointmentTypeID: metadata.appointmentTypeID,
        subject: metadata.subject,
        format: metadata.format,
        tier: metadata.tier,
        purchasedAt: new Date(session.created * 1000).toISOString()
      });
      recordReceipt(state, { kind: "package", email, orderID: metadata.orderID || session.id, sent: true, createdAt: new Date(session.created * 1000).toISOString() });
    }
  } catch {
    // A Stripe history issue should not hide the live Acuity calendar.
  }
  state.lastBackfillAt = new Date().toISOString();
  return state;
}

async function refreshBalances(state, email) {
  const packages = state.packages.filter((item) => item.email === email && item.certificate && item.appointmentTypeID);
  for (const record of packages) {
    try {
      const balance = await checkCertificate({ certificate: record.certificate, appointmentTypeID: record.appointmentTypeID, email });
      const remaining = Number(balance?.remainingCounts?.[String(record.appointmentTypeID)] ?? balance?.remaining);
      if (Number.isFinite(remaining)) record.remaining = remaining;
      record.lastCheckedAt = new Date().toISOString();
      delete record.balanceError;
    } catch (error) {
      record.balanceError = error.message;
      record.lastCheckedAt = new Date().toISOString();
    }
  }
  return state;
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
    bookingDate: readableDate(appointment.datetime),
    actionNote: cleanString(actionNote),
    bookingStep: "1"
  });
}

async function handleOperations(req, res) {
  requireAdminKey(req);
  if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  const config = await readBookingConfig();
  const rawAppointments = await listAppointments({ minDate: historyStart(), max: 1000, showall: true });
  const ledger = await updateLedger(async (state) => {
    await backfillPackages(state);
    for (const appointment of Array.isArray(rawAppointments) ? rawAppointments : []) {
      recordAppointment(state, { id: appointment.id, email: appointment.email, datetime: appointment.datetime, appointmentTypeID: appointment.appointmentTypeID, status: appointment.canceled || appointment.noShow ? "Canceled" : "Scheduled" });
    }
    return state;
  });
  const appointments = (Array.isArray(rawAppointments) ? rawAppointments : []).map((item) => normalizeAppointment(item, config.services, ledger)).sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
  const query = cleanString(queryFor(req).q).toLowerCase();
  const filtered = query ? appointments.filter((item) => [item.clientName, item.email, item.subject, item.appointmentTypeName].some((value) => String(value).toLowerCase().includes(query))) : appointments;
  return sendJson(req, res, 200, { ok: true, appointments: filtered, summary: buildOperationsSummary(filtered), lastBackfillAt: ledger.lastBackfillAt });
}

async function handleClient(req, res) {
  requireAdminKey(req);
  const query = queryFor(req);
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
  const email = requireEmail(query.email);
  const config = await readBookingConfig();
  const rawAppointments = await listAppointments({ minDate: historyStart(), max: 1000, showall: true, email });
  const ledger = await updateLedger((state) => refreshBalances(state, email));
  const appointments = (Array.isArray(rawAppointments) ? rawAppointments : []).map((item) => normalizeAppointment(item, config.services, ledger));
  return sendJson(req, res, 200, { ok: true, ...clientSnapshot(email, appointments, ledger) });
}

async function handleAppointment(req, res) {
  requireAdminKey(req);
  const query = queryFor(req);
  const body = req.method === "GET" ? null : await readJson(req);
  const id = requireAppointmentId(req.method === "GET" ? query.id : body.appointmentId);
  const config = await readBookingConfig();
  if (req.method === "GET") {
    const date = cleanString(query.date);
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
    email = await sendActionEmail({ kind: "booking", appointment, service, req, actionNote: "" });
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
}

async function handleTemplates(req, res) {
  requireAdminKey(req);
  if (req.method === "GET") return sendJson(req, res, 200, { ok: true, ...(await readTemplateState()), defaults: defaultTemplates().templates });
  if (req.method === "PUT") {
    const state = await writeTemplateState(normalizeTemplateState(await readJson(req)));
    return sendJson(req, res, 200, { ok: true, ...state, defaults: defaultTemplates().templates });
  }
  if (req.method === "POST") {
    const body = await readJson(req);
    const kind = String(body.kind || "");
    const defaults = defaultTemplates();
    if (!Object.prototype.hasOwnProperty.call(defaults.templates, kind)) return sendJson(req, res, 400, { ok: false, error: "Unknown email template." });
    const current = await readTemplateState();
    current.templates[kind] = defaults.templates[kind];
    const state = await writeTemplateState(current);
    return sendJson(req, res, 200, { ok: true, ...state, defaults: defaults.templates });
  }
  return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
}

async function handleDashboardResource(req, res, resource) {
  try {
    if (resource === "operations") return await handleOperations(req, res);
    if (resource === "client") return await handleClient(req, res);
    if (resource === "appointment") return await handleAppointment(req, res);
    if (resource === "templates") return await handleTemplates(req, res);
    return sendJson(req, res, 404, { ok: false, error: "Unknown dashboard resource." });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
}

module.exports = { handleAppointment, handleDashboardResource };
