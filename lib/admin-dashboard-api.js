const { getStripeClient } = require("./stripe");
const { cancelAppointment, checkCertificate, getAppointment, listAppointments, listAvailabilityTimes, rescheduleAppointment } = require("./acuity");
const { requireAdminKey, cleanString } = require("./admin-auth");
const { readJson, resolveBaseOrigin, sendJson } = require("./http");
const { readBookingConfig } = require("./booking-config");
const { clientKey, readLedger, updateLedger, upsertPackage, recordAction, recordAppointment, recordReceipt } = require("./operations-ledger");
const { buildOperationsSummary, clientSnapshot, historyStart, normalizeAppointment } = require("./operations");
const { defaultTemplates, normalizeTemplateState, readTemplateState, writeTemplateState } = require("./email-templates");
const { defaultProofreadingTemplates, interpolateProofreadingTemplate, normalizeProofreadingTemplateState, readProofreadingTemplateState, writeProofreadingTemplateState } = require("./proofreading-email-templates");
const { sendNotificationEmails } = require("./receipt-email");

function escapeHtml(value) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function proofreadingValue(value, fallback = "") {
  return cleanString(value) || fallback;
}

function proofreadingActionUrl(action, data) {
  const origin = cleanString(process.env.PROOFREADING_API_ORIGIN) || "https://profreading-api.vercel.app";
  const url = new URL("/api/review-action", origin);
  url.searchParams.set("action", action);
  url.searchParams.set("id", proofreadingValue(data.reference));
  url.searchParams.set("token", proofreadingValue(data.token));
  return url.toString();
}

function proofreadingRows(rows) {
  return rows.filter(([, value]) => proofreadingValue(value)).map(([label, value]) => `<tr><td style="padding:7px 12px 7px 0;color:#687383;vertical-align:top;width:150px;">${escapeHtml(label)}</td><td style="padding:7px 0;color:#17243a;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td></tr>`).join("");
}

function buildProofreadingEmailHtml({ kind, template, data }) {
  const internal = kind === "reviewDocument" || kind === "reviewPasted";
  const heading = escapeHtml(template.heading);
  const message = escapeHtml(template.message);
  const note = escapeHtml(template.extraNote);
  const serviceRows = proofreadingRows([
    ["Client", data.clientName],
    ["Email", data.clientEmail],
    ["Service level", data.serviceLevel],
    ["Word count", data.wordCount && `${data.wordCount} words`],
    ["Word count limit", data.wordCountLimit && `${data.wordCountLimit} words`],
    ["English preference", data.englishPreference],
    ["Local time", data.clientLocalTime],
    ["Deadline", data.deadline],
    ["Fee", data.price],
    ["Reference", data.reference]
  ]);
  const orderRows = proofreadingRows([
    ["Service level", data.serviceLevel],
    ["Word count", data.wordCount && `${data.wordCount} words`],
    ["English preference", data.englishPreference],
    ["Reference", data.reference]
  ]);
  const documentButton = data.documentUrl && template.ctaLabel
    ? `<p style="margin:18px 0;"><a href="${escapeHtml(data.documentUrl)}" style="display:inline-block;background:#0a3d91;color:#fffdf8;text-decoration:none;padding:13px 18px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(template.ctaLabel)}</a></p>`
    : "";
  const internalDetails = `
    <div style="border:1px solid #d8d1c4;background:#fff;padding:16px 18px;margin:18px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.45;">${serviceRows}</table></div>
    ${data.instructions ? `<p style="margin:18px 0 6px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#0a3d91;text-transform:uppercase;">Editing instructions</p><p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#39475a;white-space:pre-wrap;">${escapeHtml(data.instructions)}</p>` : ""}
    ${data.submissionText ? `<p style="margin:18px 0 6px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#0a3d91;text-transform:uppercase;">Submitted text</p><div style="border:1px solid #d8d1c4;background:#fbfaf7;padding:14px 16px;font-size:12px;line-height:1.6;color:#39475a;white-space:pre-wrap;">${escapeHtml(data.submissionText)}</div>` : ""}
    ${documentButton}
    <p style="margin:22px 0 0;"><a href="${escapeHtml(proofreadingActionUrl("accept", data))}" style="display:inline-block;background:#17243a;color:#fffdf8;text-decoration:none;padding:13px 17px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Accept and charge</a><a href="${escapeHtml(proofreadingActionUrl("refuse", data))}" style="display:inline-block;margin-left:9px;border:1px solid #17243a;color:#17243a;text-decoration:none;padding:12px 16px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Decline request</a></p>`;
  const customerDetails = `
    <div style="border:1px solid #d8d1c4;background:#fff;padding:16px 18px;margin:18px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.45;">${orderRows}</table></div>
    ${kind === "accepted" ? `<div style="border:1px solid #d8d1c4;background:#f3eee6;padding:16px 18px;margin:18px 0;"><p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#687383;text-transform:uppercase;">Your work will be returned by</p><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#17243a;">${escapeHtml(proofreadingValue(data.deadline, "the agreed deadline"))}</p></div><div style="border:1px solid #d8d1c4;background:#faf7ef;padding:16px 18px;margin:18px 0;"><p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#687383;text-transform:uppercase;">Payment receipt</p><p style="margin:0;font-size:13px;line-height:1.6;color:#39475a;">Amount charged: <strong>${escapeHtml(proofreadingValue(data.price, "Confirmed"))}</strong><br>Reference: ${escapeHtml(data.reference)}</p></div>` : `<div style="border:1px solid #d8d1c4;background:#f3eee6;padding:16px 18px;margin:18px 0;"><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#17243a;">Nothing has been charged.</p></div>`}`;

  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#17243a;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:#fffdf8;border:1px solid #d8d1c4;"><div style="background:#0a3d91;padding:24px 28px;"><img src="https://profreading-api.vercel.app/assets/finbar-horizontal-logo.png" alt="Finbar B. Elite Tutoring" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;background:#fffdf8;padding:8px 10px;"><p style="margin:18px 0 0;color:#dda31d;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">${internal ? "Proofreading review" : kind === "accepted" ? "Task accepted" : "Request update"}</p><h1 style="margin:7px 0 0;color:#fffdf8;font-family:Georgia,serif;font-size:25px;font-weight:400;line-height:1.2;">${heading}</h1></div><div style="padding:26px 28px;"><p style="margin:0;font-size:14px;line-height:1.65;color:#39475a;">${message}</p>${internal ? internalDetails : customerDetails}<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#687383;">${note}</p></div><div style="padding:15px 28px;border-top:1px solid #d8d1c4;font-size:10px;line-height:1.5;color:#8a929d;">Questions about this request? Reply directly to this email.</div></div></div></body></html>`;
}

function buildProofreadingEmail({ kind, template, data = {} }) {
  const variables = {
    clientName: proofreadingValue(data.clientName, "there"),
    clientEmail: proofreadingValue(data.clientEmail),
    serviceLevel: proofreadingValue(data.serviceLevel, "proofreading"),
    wordCount: proofreadingValue(data.wordCount),
    deadline: proofreadingValue(data.deadline, "the agreed deadline"),
    price: proofreadingValue(data.price),
    reference: proofreadingValue(data.reference)
  };
  const rendered = Object.fromEntries(Object.entries(template).map(([key, value]) => [key, interpolateProofreadingTemplate(value, variables)]));
  return { subject: rendered.subject, html: buildProofreadingEmailHtml({ kind, template: rendered, data: { ...data, ...variables } }) };
}

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
  if (state.backfillVersion >= 2) return state;
  try {
    const since = Math.floor(new Date(`${historyStart()}T00:00:00.000Z`).getTime() / 1000);
    const sessions = await getStripeClient().checkout.sessions.list({
      limit: 100,
      created: { gte: since },
      ...(state.stripeBackfillCursor ? { starting_after: state.stripeBackfillCursor } : {})
    });
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
      recordReceipt(state, { id: `package:${metadata.orderID || session.id}`, kind: "package", email, orderID: metadata.orderID || session.id, sent: true, createdAt: new Date(session.created * 1000).toISOString() });
    }
    const last = sessions.data?.at(-1);
    if (sessions.has_more && last?.id) {
      state.stripeBackfillCursor = last.id;
      state.backfillVersion = 1;
    } else {
      state.stripeBackfillCursor = "";
      state.backfillVersion = 2;
    }
  } catch {
    // A Stripe history issue should not hide the live Acuity calendar.
    state.backfillVersion = 2;
  }
  state.lastBackfillAt = new Date().toISOString();
  return state;
}

async function recordFailedAction({ action, appointment, id, note, error }) {
  try {
    await updateLedger((state) => {
      recordAction(state, {
        type: action,
        appointmentID: id,
        email: appointment?.email,
        note: cleanString(note),
        result: "failed",
        emailSent: false,
        error: cleanString(error.message)
      });
      return state;
    });
  } catch (ledgerError) {
    console.error("operations audit write failed", ledgerError);
  }
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
  return sendJson(req, res, 200, {
    ok: true,
    appointments: filtered,
    summary: buildOperationsSummary(filtered),
    lastBackfillAt: ledger.lastBackfillAt,
    backfillVersion: ledger.backfillVersion,
    backfillPending: ledger.backfillVersion < 2
  });
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
  const rawAppointments = await listAppointments({ max: 1000, showall: true, email });
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
    try {
      updated = await rescheduleAppointment(id, { datetime, calendarID: body.calendarID || appointment.calendarID });
    } catch (error) {
      await recordFailedAction({ action, appointment, id, note: body.note, error });
      throw error;
    }
    email = await sendActionEmail({ kind: "rescheduled", appointment: updated, service, req, actionNote: body.note });
  } else if (action === "cancel") {
    try {
      updated = await cancelAppointment(id, { cancelNote: cleanString(body.note) });
    } catch (error) {
      await recordFailedAction({ action, appointment, id, note: body.note, error });
      throw error;
    }
    email = await sendActionEmail({ kind: "canceled", appointment, service, req, actionNote: body.note });
  } else if (action === "resend") {
    email = await sendActionEmail({ kind: "booking", appointment, service, req, actionNote: "" });
  } else {
    return sendJson(req, res, 400, { ok: false, error: "Unknown appointment action." });
  }
  const ledger = await updateLedger((state) => {
    recordAppointment(state, { id, email: updated.email || appointment.email, subject: service.subjectName, datetime: updated.datetime || appointment.datetime, status: action === "cancel" ? "Canceled" : "Scheduled" });
    recordAction(state, { type: action, appointmentID: id, email: updated.email || appointment.email, note: cleanString(body.note), result: "completed", emailSent: email?.sent === true });
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

async function handleProofreadingTemplates(req, res) {
  requireAdminKey(req);
  if (req.method === "GET") return sendJson(req, res, 200, { ok: true, ...(await readProofreadingTemplateState()), defaults: defaultProofreadingTemplates().templates });
  if (req.method === "PUT") {
    const state = await writeProofreadingTemplateState(normalizeProofreadingTemplateState(await readJson(req)));
    return sendJson(req, res, 200, { ok: true, ...state, defaults: defaultProofreadingTemplates().templates });
  }
  if (req.method === "POST") {
    const body = await readJson(req);
    const kind = cleanString(body.kind);
    const defaults = defaultProofreadingTemplates();
    if (!Object.prototype.hasOwnProperty.call(defaults.templates, kind)) return sendJson(req, res, 400, { ok: false, error: "Unknown proofreading email template." });
    const current = await readProofreadingTemplateState();
    current.templates[kind] = defaults.templates[kind];
    const state = await writeProofreadingTemplateState(current);
    return sendJson(req, res, 200, { ok: true, ...state, defaults: defaults.templates });
  }
  return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
}

function requireProofreadingMakeKey(req) {
  const configured = cleanString(process.env.PROOFREADING_MAKE_TEMPLATE_KEY);
  if (!configured) {
    const error = new Error("Proofreading email rendering is not configured yet.");
    error.statusCode = 503;
    throw error;
  }
  if (cleanString(req.headers["x-finbar-proofreading-key"]) !== configured) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

async function handleProofreadingRender(req, res) {
  requireProofreadingMakeKey(req);
  if (req.method !== "POST" && req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  const body = req.method === "GET" ? { kind: queryFor(req).kind, data: queryFor(req) } : await readJson(req);
  const kind = cleanString(body.kind);
  const defaults = defaultProofreadingTemplates().templates;
  if (!Object.prototype.hasOwnProperty.call(defaults, kind)) return sendJson(req, res, 400, { ok: false, error: "Unknown proofreading email template." });
  const state = await readProofreadingTemplateState();
  const email = buildProofreadingEmail({ kind, template: state.templates[kind] || defaults[kind], data: body.data || {} });
  return sendJson(req, res, 200, { ok: true, ...email });
}

async function handleDashboardResource(req, res, resource) {
  try {
    if (resource === "operations") return await handleOperations(req, res);
    if (resource === "client") return await handleClient(req, res);
    if (resource === "appointment") return await handleAppointment(req, res);
    if (resource === "templates") return await handleTemplates(req, res);
    if (resource === "proofreading-templates") return await handleProofreadingTemplates(req, res);
    if (resource === "proofreading-render") return await handleProofreadingRender(req, res);
    return sendJson(req, res, 404, { ok: false, error: "Unknown dashboard resource." });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
}

module.exports = { backfillPackages, buildProofreadingEmail, handleAppointment, handleDashboardResource };
