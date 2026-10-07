const { cleanString } = require("./admin-auth");
const { clientKey } = require("./operations-ledger");
const { packageExpiryAt } = require("./package-expiry");

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function datePart(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function historyStart(days = 90) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function findService(services, appointmentTypeID) {
  return services.find((service) => String(service.appointmentTypeID) === String(appointmentTypeID)) || null;
}

function normalizeAppointment(appointment, services = [], ledger = {}) {
  const service = findService(services, appointment.appointmentTypeID);
  const email = clientKey(appointment.email);
  const packageRecords = (ledger.packages || []).filter((item) => item.email === email);
  const ledgerAppointment = (ledger.appointments || []).find((item) => String(item.id) === String(appointment.id));
  const appointmentPackages = packageRecords.filter((item) =>
    (appointment.certificate && item.certificate === appointment.certificate) ||
    (ledgerAppointment?.certificate && item.certificate === ledgerAppointment.certificate)
  );
  const packageRecord = appointmentPackages.find((item) => item.certificate) || packageRecords.find((item) =>
    item.orderID && item.orderID === ledgerAppointment?.orderID
  );
  const paidAmountMinor = Number.isFinite(Number(ledgerAppointment?.paidAmountMinor))
    ? Number(ledgerAppointment.paidAmountMinor)
    : Number.isFinite(Number(packageRecord?.paidAmountMinor)) ? Number(packageRecord.paidAmountMinor) : null;
  const sessionCount = { trial: 1, single: 1, pack6: 6, pack12: 12 }[ledgerAppointment?.tier || packageRecord?.tier] || 1;
  const lessonPaidMinor = paidAmountMinor === null ? null : Math.floor(paidAmountMinor / sessionCount);
  const startAt = new Date(appointment.datetime).getTime();
  const hoursUntilStart = Number.isFinite(startAt) ? (startAt - Date.now()) / (60 * 60 * 1000) : null;
  const savedStatus = cleanString(ledgerAppointment?.status);
  const noShow = appointment.noShow === true || savedStatus === "No-show";
  const canceled = appointment.canceled === true || noShow || savedStatus === "Canceled";
  return {
    id: String(appointment.id || ""),
    email,
    clientName: [cleanString(appointment.firstName), cleanString(appointment.lastName)].filter(Boolean).join(" ") || email,
    firstName: cleanString(appointment.firstName),
    lastName: cleanString(appointment.lastName),
    phone: cleanString(appointment.phone),
    datetime: isoDate(appointment.datetime),
    date: datePart(appointment.datetime),
    appointmentTypeID: String(appointment.appointmentTypeID || ""),
    appointmentTypeName: cleanString(appointment.type) || service?.label || "Lesson",
    calendarID: String(appointment.calendarID || service?.calendarID || ""),
    subject: cleanString(service?.subjectName) || cleanString(ledgerAppointment?.subject) || cleanString(appointment.type) || "Lesson",
    format: cleanString(service?.format),
    tier: cleanString(service?.tier),
    status: noShow ? "No-show" : canceled ? "Canceled" : savedStatus === "Completed" ? "Completed" : "Scheduled",
    canceled,
    noShow,
    packageCodes: packageRecords.map((item) => item.certificate).filter(Boolean),
    packageRemaining: packageRecords.map((item) => item.remaining).filter(Number.isFinite),
    packageExpiry: appointmentPackages.map((item) => packageExpiryAt(item)?.toISOString()).filter(Boolean),
    expiresAt: cleanString(ledgerAppointment?.expiresAt),
    hoursUntilStart,
    withinLateChangeWindow: Number.isFinite(hoursUntilStart) && hoursUntilStart >= 0 && hoursUntilStart <= 12,
    lessonPaidMinor,
    lateChangeRefundMinor: lessonPaidMinor === null ? null : Math.floor(lessonPaidMinor / 2),
    policyVersion: cleanString(ledgerAppointment?.policyVersion || packageRecord?.policyVersion),
    policyAcceptedAt: cleanString(ledgerAppointment?.policyAcceptedAt || packageRecord?.policyAcceptedAt),
    recordingUrl: cleanString(ledgerAppointment?.recordingUrl),
    recordingRecipient: cleanString(ledgerAppointment?.recordingRecipient),
    recordingSentAt: cleanString(ledgerAppointment?.recordingSentAt),
    notes: cleanString(appointment.notes),
    raw: appointment
  };
}

function buildOperationsSummary(appointments) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((item) => !item.canceled && item.date >= today);
  return {
    today: upcoming.filter((item) => item.date === today).length,
    upcoming: upcoming.length,
    recent: appointments.filter((item) => item.date < today && !item.canceled).length,
    canceled: appointments.filter((item) => item.canceled).length
  };
}

function clientSnapshot(email, appointments, ledger) {
  const key = clientKey(email);
  return {
    email: key,
    appointments: appointments.filter((item) => item.email === key),
    packages: (ledger.packages || []).filter((item) => item.email === key),
    receipts: (ledger.receipts || []).filter((item) => item.email === key),
    actions: (ledger.actions || []).filter((item) => clientKey(item.email) === key)
  };
}

module.exports = { buildOperationsSummary, clientSnapshot, historyStart, normalizeAppointment };
