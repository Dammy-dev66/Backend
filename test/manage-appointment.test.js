const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { appointmentAccessToken } = require("../lib/appointment-access");
const { recordAction, recordAppointment, recordReceipt, receiptDeliveryFields } = require("../lib/operations-ledger");

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function response() {
  return { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(body) { this.body = String(body || ""); } };
}

function request(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = {};
  return req;
}

function getRequest(values) {
  const url = new URL("/api/manage-appointment", "http://localhost");
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  const req = Readable.from([]);
  req.method = "GET";
  req.url = url.pathname + url.search;
  req.headers = {};
  return req;
}

function loadHandler({ appointmentDate, availableDate, packageRecord = null, savedAppointment = null } = {}) {
  const paths = {
    acuity: require.resolve("../lib/acuity"),
    config: require.resolve("../lib/booking-config"),
    ledger: require.resolve("../lib/operations-ledger"),
    receipt: require.resolve("../lib/receipt-email"),
    handler: require.resolve("../api-handlers/manage-appointment")
  };
  Object.values(paths).forEach((path) => delete require.cache[path]);
  const calls = { availability: [], reschedule: [], cancel: [], email: [] };
  const appointment = {
    id: "APT-1", email: "parent@example.com", firstName: "Jordan", type: "Literary Classics",
    datetime: appointmentDate || new Date(Date.now() + 21 * day).toISOString(),
    appointmentTypeID: "42", calendarID: "7", certificate: packageRecord?.certificate || ""
  };
  const ledger = {
    packages: packageRecord ? [packageRecord] : [],
    appointments: savedAppointment ? [{ id: "APT-1", ...savedAppointment }] : [],
    actions: [], receipts: []
  };
  require.cache[paths.acuity] = { exports: {
    getAppointment: async () => appointment,
    listAvailabilityTimes: async (options) => {
      calls.availability.push(options);
      return [{ time: availableDate || new Date(Date.now() + 22 * day).toISOString() }];
    },
    rescheduleAppointment: async (id, payload) => {
      calls.reschedule.push({ id, payload });
      return { ...appointment, datetime: payload.datetime };
    },
    cancelAppointment: async (id, payload) => {
      calls.cancel.push({ id, payload });
      return { ...appointment, canceled: true };
    }
  } };
  require.cache[paths.config] = { exports: {
    readBookingConfig: async () => ({ services: [{ appointmentTypeID: "42", subjectName: "Literary Classics", format: "oneToOne", tier: "single" }] })
  } };
  require.cache[paths.ledger] = { exports: {
    readLedger: async () => ledger,
    updateLedger: async (mutator) => { mutator(ledger); return ledger; },
    recordAction, recordAppointment, recordReceipt, receiptDeliveryFields
  } };
  require.cache[paths.receipt] = { exports: {
    sendNotificationEmails: async (payload) => { calls.email.push(payload); return { sent: true }; }
  } };
  return { handler: require("../api-handlers/manage-appointment"), calls, ledger };
}

test.beforeEach(() => { process.env.APPOINTMENT_ACCESS_SECRET = "test-only-appointment-secret"; });
test.afterEach(() => { delete process.env.APPOINTMENT_ACCESS_SECRET; });

test("customer link rejects a token for a different appointment", async () => {
  const { handler, calls } = loadHandler();
  const res = response();
  await handler(request({ action: "cancel", appointmentId: "APT-1", access: appointmentAccessToken("APT-2", "parent@example.com") }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.cancel.length, 0);
});

test("customer cannot change a lesson within twelve hours without the refund workflow", async () => {
  const { handler, calls } = loadHandler({ appointmentDate: new Date(Date.now() + 6 * hour).toISOString() });
  const res = response();
  await handler(request({ action: "reschedule", appointmentId: "APT-1", access: appointmentAccessToken("APT-1", "parent@example.com"), datetime: new Date(Date.now() + 22 * day).toISOString() }), res);
  assert.equal(res.statusCode, 409);
  assert.match(JSON.parse(res.body).error, /12 hours/);
  assert.equal(calls.reschedule.length, 0);
});

test("customer cannot move a package lesson beyond its original expiry", async () => {
  const purchasedAt = new Date(Date.now() - 10 * 7 * day).toISOString();
  const { handler, calls } = loadHandler({ packageRecord: { certificate: "PACK-1", tier: "pack6", purchasedAt } });
  const res = response();
  await handler(request({ action: "reschedule", appointmentId: "APT-1", access: appointmentAccessToken("APT-1", "parent@example.com"), datetime: new Date(Date.now() + 22 * day).toISOString() }), res);
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /expires/);
  assert.equal(calls.reschedule.length, 0);
});

test("customer paid single-lesson cancellation waits for a refund decision", async () => {
  const { handler, calls } = loadHandler({ savedAppointment: { stripePaymentIntentId: "pi_test_1" } });
  const res = response();
  await handler(request({ action: "cancel", appointmentId: "APT-1", access: appointmentAccessToken("APT-1", "parent@example.com") }), res);
  assert.equal(res.statusCode, 409);
  assert.match(JSON.parse(res.body).error, /payment and any refund/);
  assert.equal(calls.cancel.length, 0);
});

test("customer can freely cancel an early single-lesson package booking and restore its Acuity credit", async () => {
  const packageRecord = { certificate: "SINGLE-1", tier: "single", purchasedAt: new Date(Date.now() - day).toISOString() };
  const { handler, calls, ledger } = loadHandler({
    packageRecord,
    savedAppointment: { certificate: packageRecord.certificate, stripePaymentIntentId: "pi_package_1" }
  });
  const access = appointmentAccessToken("APT-1", "parent@example.com");
  const view = response();
  await handler(getRequest({ appointmentId: "APT-1", access }), view);
  assert.equal(JSON.parse(view.body).canCancel, true);
  assert.equal(JSON.parse(view.body).cancelNeedsReview, false);

  const canceled = response();
  await handler(request({ action: "cancel", actionId: "package-cancel-1", appointmentId: "APT-1", access }), canceled);
  assert.equal(canceled.statusCode, 200, canceled.body);
  assert.equal(calls.cancel.length, 1);
  assert.equal(calls.email.length, 1);
  assert.equal(calls.email[0].templateKind, "canceled");
  assert.equal(ledger.appointments[0].status, "Canceled");
});

test("customer view exposes only actions currently supported by the policy", async () => {
  const access = appointmentAccessToken("APT-1", "parent@example.com");
  const { handler, calls } = loadHandler({ savedAppointment: { stripePaymentIntentId: "pi_test_1" } });
  const res = response();
  await handler(getRequest({ appointmentId: "APT-1", access }), res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.canReschedule, true);
  assert.equal(body.canCancel, false);
  assert.equal(body.cancelNeedsReview, true);
  assert.equal(calls.availability.length, 0);
});

test("late lessons cannot offer replacement slots through the customer page", async () => {
  const access = appointmentAccessToken("APT-1", "parent@example.com");
  const { handler, calls } = loadHandler({ appointmentDate: new Date(Date.now() + 6 * hour).toISOString() });
  const view = response();
  await handler(getRequest({ appointmentId: "APT-1", access }), view);
  assert.equal(JSON.parse(view.body).canReschedule, false);
  assert.equal(JSON.parse(view.body).canCancel, false);
  const slots = response();
  await handler(getRequest({ appointmentId: "APT-1", access, date: new Date(Date.now() + day).toISOString().slice(0, 10) }), slots);
  assert.equal(slots.statusCode, 409);
  assert.equal(calls.availability.length, 0);
});

test("early reschedule saves the action and sends one branded email", async () => {
  const datetime = new Date(Date.now() + 22 * day).toISOString();
  const { handler, calls, ledger } = loadHandler({ availableDate: datetime });
  const res = response();
  await handler(request({ action: "reschedule", actionId: "test-action-1", appointmentId: "APT-1", access: appointmentAccessToken("APT-1", "parent@example.com"), datetime }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.reschedule.length, 1);
  assert.equal(calls.email.length, 1);
  assert.equal(ledger.actions.length, 1);
  assert.equal(ledger.actions[0].result, "completed");
});
