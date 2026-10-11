const crypto = require("node:crypto");
const { handleOptions, readJson, resolveBaseOrigin, sendJson } = require("../lib/http");
const { getAppointment, listAvailabilityTimes, rescheduleAppointment, cancelAppointment } = require("../lib/acuity");
const { isValidAppointmentAccess } = require("../lib/appointment-access");
const { isWithinLateChangeWindow } = require("../lib/appointment-policy");
const { packageExpiryAt } = require("../lib/package-expiry");
const { readBookingConfig } = require("../lib/booking-config");
const { readLedger, updateLedger, recordAction, recordAppointment, recordReceipt, receiptDeliveryFields } = require("../lib/operations-ledger");
const { sendNotificationEmails } = require("../lib/receipt-email");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function queryFor(req) {
  if (req.query && typeof req.query === "object") return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

function expiryFor(ledger, appointmentId, appointment) {
  const saved = ledger.appointments.find((item) => String(item.id) === String(appointmentId));
  if (saved?.expiresAt) {
    const savedExpiry = new Date(saved.expiresAt);
    if (!Number.isNaN(savedExpiry.getTime())) return savedExpiry;
  }
  const packageRecord = ledger.packages.find((item) =>
    (item.certificate && item.certificate === String(appointment.certificate || saved?.certificate || "")) ||
    (saved?.orderID && item.orderID === saved.orderID)
  );
  return packageExpiryAt(packageRecord);
}

async function beginAction(actionId, action, appointment, note, targetDate) {
  let began = false;
  let blockedBy = null;
  const ledger = await updateLedger((state) => {
    began = false;
    blockedBy = state.actions.find((item) => item.id === actionId ||
      (String(item.appointmentID) === String(appointment.id) && item.result === "started")) || null;
    if (blockedBy) return state;
    began = true;
    recordAction(state, { actionId, type: action, appointmentID: appointment.id, email: appointment.email, actor: "Customer", note: cleanString(note), targetDate: cleanString(targetDate), result: "started" });
    return state;
  });
  return { began, existing: blockedBy || ledger.actions.find((item) => item.id === actionId) };
}

async function authorizedAppointment(req, id, token) {
  const appointment = await getAppointment(id);
  if (!isValidAppointmentAccess(id, appointment.email, token)) {
    const error = new Error("This appointment link is invalid. Open the link from your booking email or contact Finbar.");
    error.statusCode = 403;
    throw error;
  }
  return appointment;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  try {
    const query = queryFor(req);
    const body = req.method === "POST" ? await readJson(req) : {};
    const id = cleanString(req.method === "GET" ? query.appointmentId : body.appointmentId);
    const token = cleanString(req.method === "GET" ? query.access : body.access);
    if (!id || !token) return sendJson(req, res, 400, { ok: false, error: "Appointment link is incomplete." });
    const appointment = await authorizedAppointment(req, id, token);
    const ledger = await readLedger();
    const expiresAt = expiryFor(ledger, id, appointment);
    const savedAppointment = ledger.appointments.find((item) => String(item.id) === String(id));
    const linkedPackage = ledger.packages.find((item) =>
      (item.certificate && item.certificate === String(appointment.certificate || savedAppointment?.certificate || "")) ||
      (savedAppointment?.orderID && item.orderID === savedAppointment.orderID)
    );
    const hasPackageCredit = Boolean(linkedPackage || appointment.certificate || savedAppointment?.certificate);
    const lateWindow = isWithinLateChangeWindow(appointment.datetime);
    const startAt = new Date(appointment.datetime).getTime();
    const canReschedule = !appointment.canceled && !appointment.noShow && Number.isFinite(startAt) && startAt > Date.now() && !lateWindow;
    const paidCancellationNeedsReview = Boolean(savedAppointment?.stripePaymentIntentId && !hasPackageCredit);
    const canCancel = canReschedule && !paidCancellationNeedsReview;

    if (req.method === "GET") {
      const date = cleanString(query.date);
      if (date) {
        if (!canReschedule) return sendJson(req, res, 409, { ok: false, error: "This lesson cannot be rescheduled online. Refresh the booking or contact Finbar." });
        const times = await listAvailabilityTimes({ appointmentTypeID: appointment.appointmentTypeID, calendarID: appointment.calendarID, date, ignoreAppointmentID: id });
        const eligible = (Array.isArray(times) ? times : []).filter((slot) => !expiresAt || new Date(slot.datetime || slot.time || slot).getTime() <= expiresAt.getTime());
        return sendJson(req, res, 200, { ok: true, times: eligible, expiresAt: expiresAt?.toISOString() || "" });
      }
      return sendJson(req, res, 200, {
        ok: true,
        appointment: {
          id: String(appointment.id),
          subject: cleanString(appointment.type) || "Lesson",
          datetime: appointment.datetime,
          status: appointment.canceled ? (appointment.noShow ? "No-show" : "Canceled") : "Scheduled"
        },
        expiresAt: expiresAt?.toISOString() || "",
        lateWindow,
        canReschedule,
        canCancel,
        cancelNeedsReview: Boolean(canReschedule && paidCancellationNeedsReview),
        lateRefundPercent: lateWindow ? 50 : 0,
        lateChangesAvailable: false
      });
    }

    const action = cleanString(body.action);
    if (!["cancel", "reschedule"].includes(action)) return sendJson(req, res, 400, { ok: false, error: "Choose cancel or reschedule." });
    const actionId = cleanString(body.actionId) || crypto.randomUUID();
    if (!/^[A-Za-z0-9_-]{8,120}$/.test(actionId)) return sendJson(req, res, 400, { ok: false, error: "Invalid action request ID." });
    const duplicateAction = ledger.actions.find((item) => item.id === actionId);
    if (duplicateAction) return sendJson(req, res, 409, {
      ok: false,
      error: duplicateAction.result === "started"
        ? "Your request is already being processed or needs review. Please contact Finbar before submitting it again."
        : "This request was already processed. Refresh the page or contact Finbar before making another change."
    });
    if (appointment.canceled || appointment.noShow) return sendJson(req, res, 409, { ok: false, error: "This appointment is already canceled or marked no-show." });
    if (Number.isFinite(startAt) && Date.now() >= startAt) return sendJson(req, res, 409, { ok: false, error: "This lesson has started. Please contact Finbar for help." });
    if (lateWindow) return sendJson(req, res, 409, { ok: false, error: "Changes within 12 hours require a 50% refund. Please contact Finbar so the refund and package balance can be handled correctly." });
    if (action === "cancel" && savedAppointment?.stripePaymentIntentId && !hasPackageCredit) {
      return sendJson(req, res, 409, { ok: false, error: "This paid booking needs its payment and any refund reviewed with the cancellation. Please contact Finbar to complete both together." });
    }

    const config = await readBookingConfig();
    const service = config.services.find((item) => String(item.appointmentTypeID) === String(appointment.appointmentTypeID)) || {};
    let updated = appointment;
    let targetDate = "";
    if (action === "reschedule") {
      targetDate = cleanString(body.datetime);
      const selectedDate = new Date(targetDate);
      if (!targetDate || Number.isNaN(selectedDate.getTime())) return sendJson(req, res, 400, { ok: false, error: "Choose a valid replacement time." });
      if (expiresAt && selectedDate > expiresAt) return sendJson(req, res, 400, { ok: false, error: `This lesson entitlement expires on ${expiresAt.toISOString().slice(0, 10)}. Choose a time before then.` });
      const times = await listAvailabilityTimes({ appointmentTypeID: appointment.appointmentTypeID, calendarID: appointment.calendarID, date: targetDate.slice(0, 10), ignoreAppointmentID: id });
      if (!(Array.isArray(times) ? times : []).some((slot) => String(slot.datetime || slot.time || slot) === targetDate)) return sendJson(req, res, 409, { ok: false, error: "That time is no longer available. Choose another available time." });
      const claim = await beginAction(actionId, action, appointment, body.note, targetDate);
      if (!claim.began) return sendJson(req, res, 409, { ok: false, error: "Your request is already being processed. Please contact Finbar before submitting it again." });
      try {
        updated = await rescheduleAppointment(id, { datetime: targetDate, calendarID: appointment.calendarID });
      } catch (providerError) {
        await updateLedger((state) => {
          recordAction(state, { actionId, type: action, appointmentID: id, email: appointment.email, actor: "Customer", note: cleanString(body.note), result: "failed", error: providerError.message });
          return state;
        });
        throw providerError;
      }
    } else {
      const claim = await beginAction(actionId, action, appointment, body.note);
      if (!claim.began) return sendJson(req, res, 409, { ok: false, error: "Your request is already being processed. Please contact Finbar before submitting it again." });
      try {
        updated = await cancelAppointment(id, { cancelNote: cleanString(body.note) });
      } catch (providerError) {
        await updateLedger((state) => {
          recordAction(state, { actionId, type: action, appointmentID: id, email: appointment.email, actor: "Customer", note: cleanString(body.note), result: "failed", error: providerError.message });
          return state;
        });
        throw providerError;
      }
    }

    const customerEmail = cleanString(updated.email || appointment.email);
    let email = null;
    try {
      email = await sendNotificationEmails({
        kind: action === "cancel" ? "canceled" : "rescheduled",
        templateKind: action === "cancel" ? "canceled" : "rescheduled",
        customerEmail,
        copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
        origin: resolveBaseOrigin(req),
        subject: service.subjectName || appointment.type || "lesson",
        format: service.format,
        tier: service.tier,
        appointmentTypeID: appointment.appointmentTypeID,
        recipientName: appointment.firstName,
        bookingDate: updated.datetime || appointment.datetime,
        actionNote: cleanString(body.note),
        appointmentID: id
      });
    } catch (emailError) {
      await updateLedger((state) => {
        recordAppointment(state, { id, email: customerEmail, subject: service.subjectName, datetime: updated.datetime || appointment.datetime, appointmentTypeID: appointment.appointmentTypeID, certificate: appointment.certificate, status: action === "cancel" ? "Canceled" : "Scheduled" });
        recordAction(state, { actionId, type: action, appointmentID: id, email: customerEmail, actor: "Customer", result: "completed_email_failed", note: cleanString(body.note), error: emailError.message });
        return state;
      });
      return sendJson(req, res, 502, { ok: false, actionCompleted: true, error: "The booking changed, but the confirmation email could not be sent. Finbar has been notified; please do not submit this change again." });
    }

    await updateLedger((state) => {
      recordAppointment(state, { id, email: customerEmail, subject: service.subjectName, datetime: updated.datetime || appointment.datetime, appointmentTypeID: appointment.appointmentTypeID, certificate: appointment.certificate, status: action === "cancel" ? "Canceled" : "Scheduled" });
      recordAction(state, { actionId, type: action, appointmentID: id, email: customerEmail, actor: "Customer", note: cleanString(body.note), targetDate, result: email?.accepted ? "email_accepted" : "completed", emailSent: email?.sent === true });
      recordReceipt(state, { kind: action, email: customerEmail, appointmentID: id, ...receiptDeliveryFields(email) });
      return state;
    });
    return sendJson(req, res, email?.accepted ? 202 : 200, { ok: true, accepted: email?.accepted === true, actionCompleted: true, appointment: updated, email });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
