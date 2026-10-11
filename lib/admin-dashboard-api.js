const crypto = require("node:crypto");
const { getStripeClient, isSessionPaid } = require("./stripe");
const acuity = require("./acuity");
const { cancelAppointment, checkCertificate, getAppointment, listAppointments, listAvailabilityTimes, rescheduleAppointment } = acuity;
const { requireAdminKey, cleanString } = require("./admin-auth");
const { isWithinLateChangeWindow } = require("./appointment-policy");
const { packageExpiryAt } = require("./package-expiry");
const { readJson, resolveBaseOrigin, sendJson } = require("./http");
const { readBookingConfig } = require("./booking-config");
const { clientKey, readLedger, updateLedger, upsertPackage, recordAction, recordAppointment, recordReceipt, receiptDeliveryFields } = require("./operations-ledger");
const { buildOperationsSummary, clientSnapshot, historyStart, normalizeAppointment } = require("./operations");
const { defaultTemplates, normalizeTemplateState, readTemplateState, writeTemplateState } = require("./email-templates");
const { defaultProofreadingTemplates, interpolateProofreadingTemplate, normalizeProofreadingTemplateState, readProofreadingTemplateState, writeProofreadingTemplateState } = require("./proofreading-email-templates");
const { sendNotificationEmails, sendPackageReceiptEmails } = require("./receipt-email");
const { defaultPriceState, normalizePriceState, readPriceState, resolvePriceFromState, validatePriceStateInput, writePriceState } = require("./price-config");
const { normalizeAcuityImport } = require("./acuity-import");

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

  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#17243a;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:#fffdf8;border:1px solid #d8d1c4;"><div style="background:#0a3d91;padding:24px 28px;"><img src="https://backend-ymlj.vercel.app/assets/finbar-horizontal-logo-aligned.png" alt="Finbar B. Elite Tutoring" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;background:#fffdf8;padding:8px 10px;"><p style="margin:18px 0 0;color:#dda31d;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">${internal ? "Proofreading review" : kind === "accepted" ? "Task accepted" : "Request update"}</p><h1 style="margin:7px 0 0;color:#fffdf8;font-family:Georgia,serif;font-size:25px;font-weight:400;line-height:1.2;">${heading}</h1></div><div style="padding:26px 28px;"><p style="margin:0;font-size:14px;line-height:1.65;color:#39475a;">${message}</p>${internal ? internalDetails : customerDetails}<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#687383;">${note}</p></div><div style="padding:15px 28px;border-top:1px solid #d8d1c4;font-size:10px;line-height:1.5;color:#8a929d;">Questions about this request? Reply directly to this email.</div></div></div></body></html>`;
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

function requireRecordingUrl(value) {
  const raw = cleanString(value);
  if (!raw || raw.length > 2000) throw Object.assign(new Error("Enter a valid HTTPS recording link (maximum 2,000 characters)."), { statusCode: 400 });
  let url;
  try { url = new URL(raw); } catch { throw Object.assign(new Error("Enter a valid HTTPS recording link."), { statusCode: 400 }); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname || url.hostname === "localhost") {
    throw Object.assign(new Error("Recording links must use HTTPS and cannot contain embedded credentials."), { statusCode: 400 });
  }
  return url.toString();
}

async function fetchPackageBackfill(state) {
  if (state.backfillVersion >= 2) return null;
  try {
    const since = Math.floor(new Date(`${historyStart()}T00:00:00.000Z`).getTime() / 1000);
    const sessions = await getStripeClient().checkout.sessions.list({
      limit: 100,
      created: { gte: since },
      ...(state.stripeBackfillCursor ? { starting_after: state.stripeBackfillCursor } : {})
    });
    const last = sessions.data?.at(-1);
    return {
      expectedVersion: state.backfillVersion,
      expectedCursor: cleanString(state.stripeBackfillCursor),
      sessions: sessions.data || [],
      hasMore: Boolean(sessions.has_more && last?.id),
      nextCursor: sessions.has_more && last?.id ? last.id : ""
    };
  } catch (error) {
    return {
      expectedVersion: state.backfillVersion,
      expectedCursor: cleanString(state.stripeBackfillCursor),
      error: cleanString(error.message) || "Stripe package history could not be loaded."
    };
  }
}

function applyPackageBackfill(state, backfill) {
  if (!backfill || state.backfillVersion >= 2 || state.backfillVersion !== backfill.expectedVersion ||
    cleanString(state.stripeBackfillCursor) !== backfill.expectedCursor) return state;
  state.backfillError = backfill.error || "";
  if (!backfill.error) {
    for (const session of backfill.sessions) {
      const metadata = session.metadata || {};
      const email = metadata.email || session.customer_email || session.customer_details?.email;
      if (!metadata.productID || !email || !isSessionPaid(session)) continue;
      upsertPackage(state, {
        email,
        certificate: metadata.certificate,
        orderID: metadata.orderID || session.id,
        productID: metadata.productID,
        appointmentTypeID: metadata.appointmentTypeID,
        subject: metadata.subject,
        subjectId: metadata.subjectId,
        format: metadata.format,
        tier: metadata.tier,
        purchasedAt: new Date(session.created * 1000).toISOString(),
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        paidAmountMinor: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : undefined,
        currency: cleanString(session.currency).toUpperCase()
      });
      recordReceipt(state, { id: `package:${metadata.orderID || session.id}`, kind: "package", email, orderID: metadata.orderID || session.id, deliveryStatus: "unknown", createdAt: new Date(session.created * 1000).toISOString() });
    }
    if (backfill.hasMore) {
      state.stripeBackfillCursor = backfill.nextCursor;
      state.backfillVersion = 1;
    } else {
      state.stripeBackfillCursor = "";
      state.backfillVersion = 2;
    }
  }
  state.lastBackfillAt = new Date().toISOString();
  return state;
}

async function backfillPackages(state) {
  return applyPackageBackfill(state, await fetchPackageBackfill(state));
}

async function beginAppointmentAction({ actionId, action, appointment, id, note, targetDate, verifiedRefund }) {
  let began = false;
  let blockedBy = null;
  const ledger = await updateLedger((state) => {
    began = false;
    blockedBy = state.actions.find((item) => item.id === actionId ||
      (String(item.appointmentID) === String(id) && item.result === "started") ||
      (verifiedRefund && item.stripeRefundId === verifiedRefund.id &&
        !(String(item.appointmentID) === String(id) && item.result === "failed"))) || null;
    if (blockedBy) return state;
    began = true;
    recordAction(state, {
      actionId,
      type: action,
      appointmentID: id,
      email: appointment.email,
      note: cleanString(note),
      targetDate: cleanString(targetDate),
      ...(verifiedRefund ? {
        stripeRefundId: verifiedRefund.id,
        refundAmountMinor: verifiedRefund.amount,
        refundCurrency: cleanString(verifiedRefund.currency).toUpperCase(),
        refundStatus: verifiedRefund.status
      } : {}),
      result: "started"
    });
    return state;
  });
  return { began, existing: blockedBy || ledger.actions.find((item) => item.id === actionId) };
}

async function claimAction(req, res, { actionId, action, appointment, id, note, targetDate, verifiedRefund }) {
  const result = await beginAppointmentAction({ actionId, action, appointment, id, note, targetDate, verifiedRefund });
  if (result.began) return true;
  return sendJson(req, res, 409, {
    ok: false,
    error: result.existing?.result === "started"
      ? "This action is already in progress or needs reconciliation. Refresh the booking before trying again."
      : "This action request was already processed. Refresh the booking before taking another action."
  });
}

async function verifyManualRefund({ refundId, paymentIntentId, expectedAmountMinor, maxRefundableMinor, appointmentId, ledger, purpose }) {
  if (!/^re_[A-Za-z0-9]+$/.test(cleanString(refundId))) {
    const error = new Error(`Issue the ${purpose} refund in Stripe first, then enter its refund ID (re_...).`);
    error.statusCode = 400;
    throw error;
  }
  if (!paymentIntentId || !Number.isInteger(expectedAmountMinor) || expectedAmountMinor <= 0 || !Number.isInteger(maxRefundableMinor) || maxRefundableMinor <= 0) {
    const error = new Error(`This booking has no verified payment amount, so its ${purpose} refund must be handled manually.`);
    error.statusCode = 409;
    throw error;
  }
  const matchingRefundAction = ledger.actions.find((item) => item.stripeRefundId === refundId);
  const failedRefundForAppointment = ledger.actions.find((item) =>
    String(item.appointmentID) === String(appointmentId) && item.stripeRefundId && item.result === "failed"
  );
  if (failedRefundForAppointment && failedRefundForAppointment.stripeRefundId !== refundId) {
    const error = new Error("A previous booking attempt already issued a Stripe refund. Reuse that same refund ID; do not issue another refund.");
    error.statusCode = 409;
    throw error;
  }
  const usedRefundByOtherAction = matchingRefundAction && !(
    String(matchingRefundAction.appointmentID) === String(appointmentId) && matchingRefundAction.result === "failed"
  );
  if (usedRefundByOtherAction) {
    const error = new Error("That Stripe refund is already recorded against a booking action.");
    error.statusCode = 409;
    throw error;
  }
  if (ledger.actions.some((item) => String(item.appointmentID) === String(appointmentId) && item.stripeRefundId && item.result !== "failed")) {
    const error = new Error("A refund is already recorded for this lesson. Do not refund the same booking twice.");
    error.statusCode = 409;
    throw error;
  }
  const refund = await getStripeClient().refunds.retrieve(refundId);
  const refundPaymentIntent = cleanString(refund.payment_intent?.id || refund.payment_intent);
  if (refundPaymentIntent !== String(paymentIntentId)) {
    const error = new Error("That Stripe refund does not belong to this lesson's recorded payment.");
    error.statusCode = 409;
    throw error;
  }
  if (refund.status !== "succeeded" || Number(refund.amount) !== expectedAmountMinor || cleanString(refund.currency).toLowerCase() !== "eur") {
    const error = new Error(`Stripe must show a succeeded EUR refund of exactly €${(expectedAmountMinor / 100).toFixed(2)} before this booking change can proceed.`);
    error.statusCode = 409;
    throw error;
  }
  const stripe = getStripeClient();
  if (typeof stripe.refunds.list === "function") {
    const refunds = [];
    let params = { payment_intent: paymentIntentId, limit: 100 };
    while (true) {
      const page = await stripe.refunds.list(params);
      const pageItems = Array.isArray(page?.data) ? page.data : [];
      refunds.push(...pageItems);
      if (!page?.has_more) break;
      if (!pageItems.length) {
        const error = new Error("Stripe refund history could not be fully checked. Review this payment manually before changing the booking.");
        error.statusCode = 502;
        throw error;
      }
      params = { ...params, starting_after: pageItems[pageItems.length - 1].id };
    }
    const currentRefund = refunds.find((item) => item.id === refundId);
    if (!currentRefund) {
      const error = new Error("That refund was not found in the original payment's Stripe refund history. Refresh Stripe and verify the refund ID.");
      error.statusCode = 409;
      throw error;
    }
    const activeRefunds = refunds.filter((item) => ["succeeded", "pending", "requires_action"].includes(item.status));
    const untrackedPriorRefund = activeRefunds.find((item) => item.id !== refundId && !ledger.actions.some((entry) => entry.stripeRefundId === item.id));
    if (untrackedPriorRefund) {
      const error = new Error("This payment has another Stripe refund that is not linked to a dashboard action. Reconcile its booking and refund history before continuing.");
      error.statusCode = 409;
      throw error;
    }
    const cumulativeRefundMinor = activeRefunds.reduce((sum, item) => sum + (Number.isInteger(Number(item.amount)) ? Number(item.amount) : 0), 0);
    if (cumulativeRefundMinor > maxRefundableMinor) {
      const error = new Error("The recorded Stripe refunds exceed the original payment. Do not issue another refund; reconcile the payment manually.");
      error.statusCode = 409;
      throw error;
    }
  }
  return refund;
}

async function recordFailedAction({ actionId, action, appointment, id, note, error }) {
  try {
    await updateLedger((state) => {
      recordAction(state, {
        actionId,
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

async function recordCompletedEmailFailure({ actionId, action, appointment, updated, service, id, note, error }) {
  await updateLedger((state) => {
    recordAppointment(state, {
      id,
      email: updated?.email || appointment.email,
      subject: service.subjectName || appointment.type,
      datetime: updated?.datetime || appointment.datetime,
      appointmentTypeID: appointment.appointmentTypeID,
      certificate: appointment.certificate,
      status: action === "cancel" ? "Canceled" : "Scheduled"
    });
    recordAction(state, {
      actionId,
      type: action,
      appointmentID: id,
      email: updated?.email || appointment.email,
      note: cleanString(note),
      result: "completed_email_failed",
      emailSent: false,
      error: cleanString(error.message)
    });
    recordReceipt(state, { kind: action, appointmentID: id, email: updated?.email || appointment.email, sent: false });
    return state;
  });
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
    appointmentID: appointment.id,
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
  let ledger;
  let syncWarning = "";
  try {
    const ledgerSnapshot = await readLedger();
    const packageBackfill = await fetchPackageBackfill(ledgerSnapshot);
    ledger = packageBackfill
      ? await updateLedger((state) => applyPackageBackfill(state, packageBackfill))
      : ledgerSnapshot;
  } catch (error) {
    if (error.statusCode !== 409 && error.code !== "BLOB_WRITE_CONFLICT") throw error;
    ledger = await readLedger();
    syncWarning = "Bookings are shown below. Package and action history is still syncing; refresh in a moment to check the latest balances.";
  }
  const appointments = (Array.isArray(rawAppointments) ? rawAppointments : []).map((item) => normalizeAppointment(item, config.services, ledger)).sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
  const query = cleanString(queryFor(req).q).toLowerCase();
  const filtered = query ? appointments.filter((item) => [item.clientName, item.email, item.subject, item.appointmentTypeName].some((value) => String(value).toLowerCase().includes(query))) : appointments;
  return sendJson(req, res, 200, {
    ok: true,
    appointments: filtered,
    summary: buildOperationsSummary(filtered),
    fulfillmentIssues: ledger.stripeEvents.filter((item) => item.status === "failed" ||
      (item.status === "processing" && Date.now() - new Date(item.updatedAt || item.createdAt).getTime() > 10 * 60 * 1000))
      .map(({ id, sessionId, orderID, email, status, stage, error, updatedAt }) => ({ id, sessionId, orderID, email, status, stage, error, updatedAt })),
    actionIssues: ledger.actions.filter((item) => (item.appointmentID || item.type === "package-booking") &&
      ["started", "failed", "completed_email_failed", "completed_followup_failed"].includes(item.result)).slice(0, 30)
      .map(({ id, actionId, type, appointmentID, email, actor, targetDate, datetime, certificate, result, error, createdAt }) => ({ id, actionId, type, appointmentID, email, actor, targetDate, datetime, certificate, result, error, createdAt })),
    lastBackfillAt: ledger.lastBackfillAt,
    backfillVersion: ledger.backfillVersion,
    backfillPending: ledger.backfillVersion < 2 && !ledger.backfillError,
    backfillError: ledger.backfillError,
    syncWarning
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

async function handleReceipt(req, res) {
  requireAdminKey(req);
  if (req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  const body = await readJson(req);
  const receiptId = cleanString(body.receiptId);
  if (!receiptId) return sendJson(req, res, 400, { ok: false, error: "Choose a receipt to resend." });
  const ledger = await readLedger();
  const receipt = ledger.receipts.find((item) => item.id === receiptId);
  if (!receipt) return sendJson(req, res, 404, { ok: false, error: "This receipt is no longer in the operations history." });

  let email;
  let appointmentID = receipt.appointmentID;
  try {
    if (receipt.kind === "package") {
      const purchase = ledger.packages.find((item) => item.orderID === receipt.orderID && item.email === receipt.email);
      if (!purchase) return sendJson(req, res, 404, { ok: false, error: "The package details needed to rebuild this receipt were not found." });
      const price = Number.isFinite(Number(purchase.paidAmountMinor)) ? Number(purchase.paidAmountMinor) / 100 : undefined;
      email = await sendPackageReceiptEmails({
        customerEmail: receipt.email,
        copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
        origin: resolveBaseOrigin(req),
        subject: purchase.subject,
        subjectId: purchase.subjectId,
        format: purchase.format,
        tier: purchase.tier,
        appointmentTypeID: purchase.appointmentTypeID,
        productID: purchase.productID,
        certificate: purchase.certificate,
        orderID: purchase.orderID,
        totalPrice: price,
        bookingStep: "2"
      });
    } else if (receipt.kind === "booking" && receipt.appointmentID) {
      const appointment = await getAppointment(receipt.appointmentID);
      const config = await readBookingConfig();
      const service = serviceFor(config, appointment);
      email = await sendActionEmail({ kind: "booking", appointment, service, req, actionNote: "" });
    } else {
      return sendJson(req, res, 400, { ok: false, error: "This email type cannot be resent from the dashboard yet." });
    }
  } catch (error) {
    email = { sent: false, failures: [cleanString(error.message) || "Email provider request failed."] };
  }

  await updateLedger((state) => {
    recordReceipt(state, { id: `resend:${receiptId}:${crypto.randomUUID()}`, kind: receipt.kind, email: receipt.email, orderID: receipt.orderID, appointmentID, ...receiptDeliveryFields(email) });
    recordAction(state, { type: "receipt_resend", appointmentID, email: receipt.email, result: email?.accepted ? "email_accepted" : email?.sent === true ? "completed" : "failed", emailSent: email?.sent === true, receiptId, error: email?.sent === true || email?.accepted ? "" : cleanString(email?.failures?.[0] || email?.reason) });
    return state;
  });
  return sendJson(req, res, email?.accepted ? 202 : email?.sent === true ? 200 : 502, {
    ok: email?.accepted === true || email?.sent === true,
    accepted: email?.accepted === true,
    error: email?.sent === true || email?.accepted ? "" : "The receipt could not be sent. The attempt has been recorded.",
    email
  });
}

async function handleAppointment(req, res) {
  requireAdminKey(req);
  const query = queryFor(req);
  const body = req.method === "GET" ? null : await readJson(req);
  const action = req.method === "POST" ? cleanString(body.action) : "";
  const id = req.method === "GET"
    ? requireAppointmentId(query.id)
    : action === "reconcile" ? cleanString(body.appointmentId) : requireAppointmentId(body.appointmentId);
  const config = await readBookingConfig();
  if (req.method === "GET") {
    const date = cleanString(query.date);
    if (!date) return sendJson(req, res, 400, { ok: false, error: "A date is required to load availability." });
    const appointment = await getAppointment(id);
    const times = await listAvailabilityTimes({ appointmentTypeID: appointment.appointmentTypeID, calendarID: appointment.calendarID, date, ignoreAppointmentID: id });
    return sendJson(req, res, 200, { ok: true, appointment: normalizeAppointment(appointment, config.services, await readLedger()), times: Array.isArray(times) ? times : [] });
  }
  if (req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  if (action === "reconcile") {
    const actionId = cleanString(body.actionId);
    const note = cleanString(body.note);
    if (!actionId || note.length < 8) return sendJson(req, res, 400, { ok: false, error: "Provide the action ID and a short note describing what you verified in Acuity and email history." });
    const existingAction = (await readLedger()).actions.find((item) => item.id === actionId);
    if (existingAction?.type === "package-booking") {
      const resolution = cleanString(body.resolution);
      if (!["confirmed", "not-booked"].includes(resolution) || (resolution === "confirmed" && !id) || (resolution === "not-booked" && id)) {
        return sendJson(req, res, 400, { ok: false, error: "Choose whether Acuity contains the lesson, and provide its appointment ID when it does." });
      }
      if (resolution === "not-booked" && existingAction.appointmentID) {
        return sendJson(req, res, 409, { ok: false, error: "This attempt already has an Acuity appointment ID. Verify that appointment rather than releasing the booking request." });
      }
      let verifiedAppointment = null;
      if (resolution === "confirmed") {
        verifiedAppointment = await getAppointment(id);
        const expectedTime = new Date(existingAction.datetime).getTime();
        const actualTime = new Date(verifiedAppointment.datetime).getTime();
        if (String(verifiedAppointment.id) !== String(id) ||
          clientKey(verifiedAppointment.email) !== clientKey(existingAction.email) ||
          String(verifiedAppointment.appointmentTypeID) !== String(existingAction.appointmentTypeID) ||
          !Number.isFinite(expectedTime) || !Number.isFinite(actualTime) || Math.abs(expectedTime - actualTime) > 60000 ||
          (verifiedAppointment.certificate && verifiedAppointment.certificate !== existingAction.certificate)) {
          return sendJson(req, res, 409, { ok: false, error: "That Acuity appointment does not match this package booking attempt. Check the client, lesson type, time, and package code." });
        }
      }
      let reconciled = false;
      const ledger = await updateLedger((state) => {
        reconciled = false;
        const item = state.actions.find((entry) => entry.id === actionId && entry.type === "package-booking");
        if (!item || !["started", "failed", "completed_email_failed", "completed_followup_failed"].includes(item.result)) return state;
        if (resolution === "confirmed") {
          recordAppointment(state, {
            id: verifiedAppointment.id,
            email: item.email,
            datetime: verifiedAppointment.datetime,
            appointmentTypeID: verifiedAppointment.appointmentTypeID,
            certificate: item.certificate,
            status: verifiedAppointment.canceled ? "Canceled" : "Scheduled"
          });
          item.appointmentID = verifiedAppointment.id;
          item.result = "reconciled";
        } else {
          item.result = "rejected";
        }
        item.reconciledAt = new Date().toISOString();
        item.updatedAt = item.reconciledAt;
        item.reconciledBy = "Fin";
        item.reconciliationNote = note;
        reconciled = true;
        return state;
      });
      if (!reconciled) return sendJson(req, res, 409, { ok: false, error: "This booking attempt is no longer awaiting reconciliation. Refresh operations." });
      return sendJson(req, res, 200, { ok: true, action: ledger.actions.find((item) => item.id === actionId) });
    }
    if (!id) return sendJson(req, res, 400, { ok: false, error: "Appointment ID is required for this action." });
    let reconciled = false;
    const ledger = await updateLedger((state) => {
      reconciled = false;
      const item = state.actions.find((entry) => entry.id === actionId && String(entry.appointmentID) === String(id));
      if (!item || !["started", "failed", "completed_email_failed"].includes(item.result)) return state;
      item.result = "reconciled";
      item.reconciledAt = new Date().toISOString();
      item.updatedAt = item.reconciledAt;
      item.reconciledBy = "Fin";
      item.reconciliationNote = note;
      reconciled = true;
      return state;
    });
    if (!reconciled) return sendJson(req, res, 409, { ok: false, error: "This action is no longer awaiting reconciliation. Refresh the operations list." });
    return sendJson(req, res, 200, { ok: true, action: ledger.actions.find((item) => item.id === actionId) });
  }
  if (!["complete", "reschedule", "cancel", "no-show", "resend", "send-recording"].includes(action)) return sendJson(req, res, 400, { ok: false, error: "Unknown appointment action." });
  const actionId = cleanString(body.actionId) || crypto.randomUUID();
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(actionId)) return sendJson(req, res, 400, { ok: false, error: "Invalid action request ID." });
  const appointment = await getAppointment(id);
  const ledgerBeforeAction = await readLedger();
  const duplicateAction = ledgerBeforeAction.actions.find((item) => item.id === actionId);
  if (duplicateAction) return sendJson(req, res, 409, {
    ok: false,
    error: duplicateAction.result === "started"
      ? "This action is already in progress or needs reconciliation. Refresh the booking before trying again."
      : "This action request was already processed. Refresh the booking before taking another action."
  });
  const ledgerAppointment = ledgerBeforeAction.appointments.find((item) => String(item.id) === String(id));
  const linkedPackage = ledgerBeforeAction.packages.find((item) =>
    (appointment.certificate && item.certificate === String(appointment.certificate)) ||
    (ledgerAppointment?.certificate && item.certificate === ledgerAppointment.certificate) ||
    (ledgerAppointment?.orderID && item.orderID === ledgerAppointment.orderID)
  );
  let expiresAt = ledgerAppointment?.expiresAt ? new Date(ledgerAppointment.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    expiresAt = packageExpiryAt(linkedPackage);
  }
  const service = serviceFor(config, appointment);
  if (action !== "resend" && (appointment.canceled || appointment.noShow || ["Canceled", "No-show"].includes(ledgerAppointment?.status))) {
    return sendJson(req, res, 409, { ok: false, error: "This appointment is already canceled or marked no-show." });
  }
  if (action === "no-show" && ledgerAppointment?.status === "Completed") {
    return sendJson(req, res, 409, { ok: false, error: "This lesson is already marked completed." });
  }
  const appointmentStart = new Date(appointment.datetime).getTime();
  const lateChange = isWithinLateChangeWindow(appointment.datetime);
  const isPackageBooking = Boolean(linkedPackage || appointment.certificate || ledgerAppointment?.certificate);
  const paymentIntentId = cleanString(ledgerAppointment?.stripePaymentIntentId || linkedPackage?.stripePaymentIntentId);
  const paidAmountMinor = Number(ledgerAppointment?.paidAmountMinor ?? linkedPackage?.paidAmountMinor);
  const tier = cleanString(ledgerAppointment?.tier || linkedPackage?.tier || service.tier);
  const sessionCount = { trial: 1, single: 1, pack6: 6, pack12: 12 }[tier] || 1;
  const lessonPaidMinor = Number.isFinite(paidAmountMinor) ? Math.floor(paidAmountMinor / sessionCount) : null;
  const lateRefundAmountMinor = lessonPaidMinor === null ? null : Math.floor(lessonPaidMinor / 2);
  let verifiedRefund = null;
  if (["cancel", "reschedule"].includes(action) && lateChange) {
    if (action === "cancel" && isPackageBooking) {
      return sendJson(req, res, 409, { ok: false, error: "Late package cancellations need manual Acuity credit review. Do not mark this cancellation as a no-show; contact Finbar to resolve the package balance and refund together." });
    }
    try {
      verifiedRefund = await verifyManualRefund({
        refundId: cleanString(body.stripeRefundId),
        paymentIntentId,
        expectedAmountMinor: lateRefundAmountMinor,
        maxRefundableMinor: paidAmountMinor,
        appointmentId: id,
        ledger: ledgerBeforeAction,
        purpose: "50%"
      });
    } catch (error) {
      return sendJson(req, res, error.statusCode || 502, { ok: false, error: error.message });
    }
  }
  const standalonePaidLesson = !isPackageBooking && Boolean(ledgerAppointment?.stripePaymentIntentId) && ["single", "trial"].includes(tier);
  if (action === "cancel" && standalonePaidLesson && !lateChange) {
    try {
      verifiedRefund = await verifyManualRefund({
        refundId: cleanString(body.stripeRefundId),
        paymentIntentId,
        expectedAmountMinor: paidAmountMinor,
        maxRefundableMinor: paidAmountMinor,
        appointmentId: id,
        ledger: ledgerBeforeAction,
        purpose: "full"
      });
    } catch (error) {
      return sendJson(req, res, error.statusCode || 502, { ok: false, error: error.message });
    }
  }
  if (["reschedule", "cancel"].includes(action) && Number.isFinite(appointmentStart) && Date.now() >= appointmentStart) {
    return sendJson(req, res, 409, { ok: false, error: "This lesson has already started. After the 20-minute wait, use Mark no-show if the student did not attend." });
  }
  let updated = appointment;
  let email = null;
  if (action === "send-recording") {
    if (service.format !== "oneToTwo") return sendJson(req, res, 400, { ok: false, error: "Recording delivery is available only for a two-student lesson." });
    if (ledgerAppointment?.status !== "Completed") return sendJson(req, res, 409, { ok: false, error: "Mark the lesson completed before sending its recording." });
    if (body.authorized !== true) return sendJson(req, res, 400, { ok: false, error: "Confirm that the student or guardian authorized sharing the recording with this recipient." });
    const recordingUrl = requireRecordingUrl(body.recordingUrl);
    const recipientEmail = requireEmail(body.recipientEmail);
    const note = `Recording sent to ${recipientEmail}`;
    if (!await claimAction(req, res, { actionId, action, appointment, id, note })) return;
    const consentConfirmedAt = new Date().toISOString();
    await updateLedger((state) => recordAppointment(state, {
      id,
      email: appointment.email,
      subject: service.subjectName || appointment.type,
      datetime: appointment.datetime,
      appointmentTypeID: appointment.appointmentTypeID,
      status: "Completed",
      recordingUrl,
      recordingRecipient: recipientEmail,
      recordingConsentConfirmedAt: consentConfirmedAt
    }));
    try {
      email = await sendNotificationEmails({
        kind: "recording",
        templateKind: "recording",
        customerEmail: recipientEmail,
        copyEmail: "",
        suppressCopy: true,
        ctaUrl: recordingUrl,
        origin: resolveBaseOrigin(req),
        subject: service.subjectName || appointment.type || "lesson",
        format: service.format,
        tier: service.tier,
        recipientName: appointment.firstName,
        bookingDate: readableDate(appointment.datetime)
      });
    } catch (error) {
      await recordFailedAction({ actionId, action, appointment, id, note, error });
      throw error;
    }
    const sent = email?.sent === true;
    const accepted = email?.accepted === true;
    const ledger = await updateLedger((state) => {
      if (sent) recordAppointment(state, {
        id,
        email: appointment.email,
        subject: service.subjectName || appointment.type,
        datetime: appointment.datetime,
        appointmentTypeID: appointment.appointmentTypeID,
        status: "Completed",
        recordingUrl,
        recordingRecipient: recipientEmail,
        recordingConsentConfirmedAt: consentConfirmedAt,
        recordingSentAt: new Date().toISOString()
      });
      recordAction(state, { actionId, type: action, appointmentID: id, email: appointment.email, note, result: sent ? "completed" : accepted ? "email_accepted" : "failed", emailSent: sent, error: sent || accepted ? "" : cleanString(email?.failures?.[0] || email?.reason) });
      recordReceipt(state, { kind: "recording", appointmentID: id, email: appointment.email, ...receiptDeliveryFields(email) });
      return state;
    });
    if (!sent && !accepted) return sendJson(req, res, 502, { ok: false, error: "The recording email could not be accepted for delivery. The attempt has been recorded; verify the address and email delivery before retrying." });
    return sendJson(req, res, accepted ? 202 : 200, { ok: true, accepted, appointment: normalizeAppointment(appointment, config.services, ledger), email });
  } else if (action === "complete") {
    if (!Number.isFinite(appointmentStart) || Date.now() < appointmentStart) {
      return sendJson(req, res, 400, { ok: false, error: "A lesson can only be marked completed after its scheduled start." });
    }
    if (ledgerAppointment?.status === "Completed") {
      return sendJson(req, res, 409, { ok: false, error: "This lesson is already marked completed." });
    }
    if (!await claimAction(req, res, { actionId, action, appointment, id, note: body.note })) return;
  } else if (action === "reschedule") {
    const datetime = cleanString(body.datetime);
    if (!datetime) return sendJson(req, res, 400, { ok: false, error: "Choose a new date and time first." });
    const requestedDate = new Date(datetime);
    if (Number.isNaN(requestedDate.getTime())) return sendJson(req, res, 400, { ok: false, error: "Choose a valid replacement date and time." });
    if (expiresAt && !Number.isNaN(requestedDate.getTime()) && requestedDate > expiresAt) {
      return sendJson(req, res, 400, { ok: false, error: `This lesson entitlement expires on ${expiresAt.toISOString().slice(0, 10)}. Choose a replacement time before then.` });
    }
    const availableTimes = await listAvailabilityTimes({
      appointmentTypeID: appointment.appointmentTypeID,
      calendarID: appointment.calendarID,
      date: datetime.slice(0, 10),
      ignoreAppointmentID: id
    });
    if (!(Array.isArray(availableTimes) ? availableTimes : []).some((slot) => String(slot.datetime || slot.time || slot) === datetime)) {
      return sendJson(req, res, 409, { ok: false, error: "That time is no longer available. Choose a current Acuity availability slot." });
    }
    if (!await claimAction(req, res, { actionId, action, appointment, id, note: body.note, targetDate: datetime, verifiedRefund })) return;
    try {
      updated = await rescheduleAppointment(id, { datetime, calendarID: appointment.calendarID });
    } catch (error) {
      await recordFailedAction({ actionId, action, appointment, id, note: body.note, error });
      throw error;
    }
    try {
      email = await sendActionEmail({ kind: "rescheduled", appointment: updated, service, req, actionNote: body.note });
    } catch (error) {
      await recordCompletedEmailFailure({ actionId, action, appointment, updated, service, id, note: body.note, error });
      return sendJson(req, res, 502, { ok: false, actionCompleted: true, error: "The lesson was rescheduled, but its confirmation email failed. Refresh the booking before taking any further action." });
    }
  } else if (action === "cancel") {
    if (!await claimAction(req, res, { actionId, action, appointment, id, note: body.note, verifiedRefund })) return;
    try {
      updated = await cancelAppointment(id, { cancelNote: cleanString(body.note) });
    } catch (error) {
      await recordFailedAction({ actionId, action, appointment, id, note: body.note, error });
      throw error;
    }
    try {
      email = await sendActionEmail({ kind: "canceled", appointment, service, req, actionNote: body.note });
    } catch (error) {
      await recordCompletedEmailFailure({ actionId, action, appointment, updated, service, id, note: body.note, error });
      return sendJson(req, res, 502, { ok: false, actionCompleted: true, error: "The lesson was canceled, but its confirmation email failed. Refresh the booking before taking any further action." });
    }
  } else if (action === "no-show") {
    const lessonStart = new Date(appointment.datetime).getTime();
    if (!Number.isFinite(lessonStart) || Date.now() < lessonStart + 20 * 60 * 1000) {
      return sendJson(req, res, 400, { ok: false, error: "A lesson can only be marked no-show after its 20-minute waiting period." });
    }
    if (!await claimAction(req, res, { actionId, action, appointment, id, note: body.note })) return;
    try {
      updated = await cancelAppointment(id, { cancelNote: "Client did not attend after the 20-minute waiting period.", noShow: true });
    } catch (error) {
      await recordFailedAction({ actionId, action, appointment, id, note: body.note, error });
      throw error;
    }
  } else if (action === "resend") {
    if (!await claimAction(req, res, { actionId, action, appointment, id, note: body.note })) return;
    email = await sendActionEmail({ kind: "booking", appointment, service, req, actionNote: "" });
  }
  const ledger = await updateLedger((state) => {
    recordAppointment(state, { id, email: updated.email || appointment.email, subject: service.subjectName, datetime: updated.datetime || appointment.datetime, status: action === "no-show" ? "No-show" : action === "cancel" ? "Canceled" : action === "complete" ? "Completed" : action === "resend" && ledgerAppointment?.status === "Completed" ? "Completed" : "Scheduled" });
    recordAction(state, { actionId, type: action, appointmentID: id, email: updated.email || appointment.email, note: cleanString(body.note), result: email?.accepted ? "email_accepted" : email && !email.sent ? "completed_email_failed" : "completed", emailSent: email?.sent === true, error: email && !email.sent && !email.accepted ? cleanString(email.failures?.[0] || email.reason) : "" });
    if (email) recordReceipt(state, { kind: action === "resend" ? "booking" : action, appointmentID: id, email: updated.email || appointment.email, ...receiptDeliveryFields(email) });
    return state;
  });
  return sendJson(req, res, email?.accepted ? 202 : 200, { ok: true, accepted: email?.accepted === true, actionCompleted: true, appointment: normalizeAppointment(updated, config.services, ledger), email });
}

async function handleTemplates(req, res) {
  requireAdminKey(req);
  if (req.method === "GET") return sendJson(req, res, 200, { ok: true, ...(await readTemplateState()), defaults: defaultTemplates().templates });
  if (req.method === "PUT") {
    const body = await readJson(req);
    const next = normalizeTemplateState(body);
    next._revision = cleanString(body._revision);
    const state = await writeTemplateState(next);
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
    const body = await readJson(req);
    const next = normalizeProofreadingTemplateState(body);
    next._revision = cleanString(body._revision);
    const state = await writeProofreadingTemplateState(next);
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

function buildPricingServices(pricing, config, appointmentTypes) {
  const pricesByAppointmentType = new Map((Array.isArray(appointmentTypes) ? appointmentTypes : []).map((item) => {
    const rawPrice = item.price;
    const price = typeof rawPrice === "number" || (typeof rawPrice === "string" && rawPrice.trim())
      ? Number(rawPrice)
      : NaN;
    return [String(item.id), price];
  }));
  return config.services.map((service) => {
    const websitePrice = resolvePriceFromState(pricing, service.subjectId, service.format, service.tier);
    const acuityPrice = pricesByAppointmentType.get(String(service.appointmentTypeID));
    const hasAcuityPrice = Number.isFinite(acuityPrice);
    return {
      id: service.id,
      subjectId: service.subjectId,
      subject: service.subjectName,
      label: service.label,
      format: service.format,
      tier: service.tier,
      appointmentTypeID: service.appointmentTypeID,
      websitePrice,
      acuityPrice: hasAcuityPrice ? acuityPrice : null,
      matchesAcuity: hasAcuityPrice ? Math.round(websitePrice * 100) === Math.round(acuityPrice * 100) : null
    };
  });
}

async function pricingOverview(pricingState) {
  const [pricing, config, appointmentTypes] = await Promise.all([
    pricingState || readPriceState(),
    readBookingConfig(),
    Object.hasOwn(acuity, "listAppointmentTypes") ? acuity.listAppointmentTypes().catch(() => []) : []
  ]);
  return { pricing, services: buildPricingServices(pricing, config, appointmentTypes) };
}

async function handlePricing(req, res) {
  requireAdminKey(req);
  if (req.method === "GET") return sendJson(req, res, 200, { ok: true, ...(await pricingOverview()), defaults: defaultPriceState() });
  if (req.method === "PUT") {
    const body = await readJson(req);
    validatePriceStateInput(body);
    const next = normalizePriceState(body);
    next._revision = cleanString(body._revision);
    const pricing = await writePriceState(next);
    return sendJson(req, res, 200, { ok: true, ...(await pricingOverview(pricing)), defaults: defaultPriceState() });
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

async function handleAcuityImport(req, res) {
  requireAdminKey(req);
  if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Acuity import preview only supports loading data." });
  if (!acuity.hasAcuityCredentials()) {
    return sendJson(req, res, 503, { ok: false, error: "Acuity is not connected to this environment. Preview requires a dedicated test account configured with ACUITY_PREVIEW_USER_ID and ACUITY_PREVIEW_API_KEY; production credentials are not reused in Preview." });
  }
  const [appointmentTypes, products] = await Promise.all([acuity.listAppointmentTypes(), acuity.listProducts()]);
  return sendJson(req, res, 200, { ok: true, ...normalizeAcuityImport(appointmentTypes, products) });
}

async function handleDashboardResource(req, res, resource) {
  res.setHeader?.("Cache-Control", "private, no-store, max-age=0");
  try {
    if (resource === "operations") return await handleOperations(req, res);
    if (resource === "client") return await handleClient(req, res);
    if (resource === "receipt") return await handleReceipt(req, res);
    if (resource === "appointment") return await handleAppointment(req, res);
    if (resource === "templates") return await handleTemplates(req, res);
    if (resource === "pricing") return await handlePricing(req, res);
    if (resource === "acuity-import") return await handleAcuityImport(req, res);
    if (resource === "proofreading-templates") return await handleProofreadingTemplates(req, res);
    if (resource === "proofreading-render") return await handleProofreadingRender(req, res);
    return sendJson(req, res, 404, { ok: false, error: "Unknown dashboard resource." });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
}

module.exports = { backfillPackages, buildPricingServices, buildProofreadingEmail, handleAppointment, handleAcuityImport, handleDashboardResource, handleOperations };
