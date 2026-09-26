const { cleanString } = require("./admin-auth");
const { clientKey } = require("./operations-ledger");

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
  const canceled = appointment.canceled === true || appointment.noShow === true;
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
    status: canceled ? (appointment.noShow ? "No show" : "Canceled") : "Scheduled",
    canceled,
    noShow: appointment.noShow === true,
    packageCodes: packageRecords.map((item) => item.certificate).filter(Boolean),
    packageRemaining: packageRecords.map((item) => item.remaining).filter(Number.isFinite),
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
