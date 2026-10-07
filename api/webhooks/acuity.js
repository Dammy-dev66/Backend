const crypto = require("node:crypto");
const { sendJson } = require("../../lib/http");
const { acuityCredentials, getAppointment } = require("../../lib/acuity");
const { readBookingConfig } = require("../../lib/booking-config");
const { updateLedger, recordAction, recordAppointment } = require("../../lib/operations-ledger");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function serviceFor(config, appointment) {
  return config.services.find((service) => String(service.appointmentTypeID) === String(appointment.appointmentTypeID)) || {};
}

function normalizedAction(value) {
  return cleanString(value).replace(/^appointment\./, "").toLowerCase();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  const expectedSignature = req.headers["x-acuity-signature"];
  const { apiKey: secret } = acuityCredentials();

  if (!secret) return sendJson(req, res, 503, { ok: false, error: "Acuity webhook verification is not configured." });
  if (typeof expectedSignature !== "string" || !expectedSignature) {
    return sendJson(req, res, 401, { ok: false, error: "Missing Acuity signature." });
  }

  const actualSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const actual = Buffer.from(actualSignature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return sendJson(req, res, 401, { ok: false, error: "Invalid Acuity signature." });
  }

  const parsed = Object.fromEntries(new URLSearchParams(rawBody));
  const event = Object.keys(parsed).length ? parsed : {};
  const action = normalizedAction(event.action || event.event);
  const id = cleanString(event.id || event.appointmentID);
  if (["scheduled", "rescheduled", "canceled", "changed"].includes(action)) {
    if (!id) return sendJson(req, res, 400, { ok: false, error: "Acuity appointment notification has no appointment ID." });
    try {
      const [appointment, config] = await Promise.all([getAppointment(id), readBookingConfig()]);
      const service = serviceFor(config, appointment);
      const datetime = cleanString(appointment.datetime);
      const auditId = `acuity:${appointment.id}:${action}:${datetime}`;
      let reconciledStatus = "Scheduled";

      await updateLedger((state) => {
        const existing = state.appointments.find((item) => String(item.id) === String(appointment.id));
        reconciledStatus = appointment.noShow
          ? "No-show"
          : appointment.canceled
            ? "Canceled"
            : existing?.status === "Completed" ? "Completed" : "Scheduled";
        recordAppointment(state, {
          id: appointment.id,
          email: appointment.email,
          subject: service.subjectName || existing?.subject || appointment.type,
          subjectId: service.subjectId || existing?.subjectId,
          datetime,
          appointmentTypeID: appointment.appointmentTypeID,
          calendarID: appointment.calendarID,
          certificate: appointment.certificate || existing?.certificate,
          orderID: existing?.orderID,
          format: service.format || existing?.format,
          tier: service.tier || existing?.tier,
          status: reconciledStatus
        });
        recordAction(state, {
          actionId: auditId,
          type: `acuity_${action}`,
          appointmentID: appointment.id,
          email: appointment.email,
          actor: "Acuity",
          result: "completed",
          datetime,
          appointmentStatus: reconciledStatus
        });
        return state;
      });
    } catch (error) {
      console.error("acuity.webhook reconciliation failed", { id, action, error: cleanString(error.message) });
      return sendJson(req, res, 500, { ok: false, error: "The Acuity event could not be reconciled yet." });
    }
  } else if (action !== "order.completed") {
    return sendJson(req, res, 200, { ok: true, ignored: true, action });
  }

  console.log("acuity.webhook", {
    receivedAt: new Date().toISOString(),
    kind: action === "order.completed" ? "package-order" : "appointment",
    action,
    appointmentID: id
  });

  return sendJson(req, res, 200, { ok: true, reconciled: ["scheduled", "rescheduled", "canceled", "changed"].includes(action), action });
};
