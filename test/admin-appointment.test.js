const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

function response() {
  return { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(body) { this.body = String(body || ""); } };
}

function request(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = { "x-finbar-admin-key": "fin-key" };
  return req;
}

function loadHandler({ rescheduleError } = {}) {
  const paths = {
    acuity: require.resolve("../lib/acuity"),
    config: require.resolve("../lib/booking-config"),
    ledger: require.resolve("../lib/operations-ledger"),
    receipt: require.resolve("../lib/receipt-email"),
    handler: require.resolve("../lib/admin-dashboard-api")
  };
  const calls = { reschedule: [], cancel: [], email: [] };
  const ledger = { packages: [], receipts: [], appointments: [], actions: [] };
  Object.values(paths).forEach((item) => delete require.cache[item]);
  require.cache[paths.acuity] = { exports: {
    checkCertificate: async () => ({ remaining: 0 }),
    getAppointment: async () => ({ id: "APT-1", email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: "2026-10-03T10:00:00+01:00", appointmentTypeID: "42", calendarID: "7", type: "English Literature" }),
    listAppointments: async () => [],
    listAvailabilityTimes: async () => [{ time: "2026-10-04T10:00:00+01:00" }],
    rescheduleAppointment: async (id, payload) => {
      calls.reschedule.push({ id, payload });
      if (rescheduleError) throw rescheduleError;
      return { id, email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: payload.datetime, appointmentTypeID: "42", calendarID: "7", type: "English Literature" };
    },
    cancelAppointment: async (id, payload) => { calls.cancel.push({ id, payload }); return { id, email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: "2026-10-03T10:00:00+01:00", appointmentTypeID: "42", calendarID: "7", canceled: true }; }
  } };
  require.cache[paths.config] = { exports: { readBookingConfig: async () => ({ services: [{ appointmentTypeID: "42", subjectName: "English Literature", format: "oneToOne", tier: "single" }] }) } };
  require.cache[paths.ledger] = { exports: {
    clientKey: (email) => String(email || "").trim().toLowerCase(),
    readLedger: async () => ledger,
    updateLedger: async (mutator) => { mutator(ledger); return ledger; },
    upsertPackage: (state) => state,
    recordAction: (state, item) => state.actions.push(item),
    recordAppointment: (state, item) => state.appointments.push(item),
    recordReceipt: (state, item) => state.receipts.push(item)
  } };
  require.cache[paths.receipt] = { exports: { sendNotificationEmails: async (payload) => { calls.email.push(payload); return { sent: true }; } } };
  const dashboardApi = require("../lib/admin-dashboard-api");
  return { handler: (req, res) => dashboardApi.handleDashboardResource(req, res, "appointment"), calls, ledger };
}

test("dashboard reschedule uses Acuity and sends the branded reschedule email", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, calls } = loadHandler();
  const res = response();
  await handler(request({ action: "reschedule", appointmentId: "APT-1", datetime: "2026-10-04T10:00:00+01:00", note: "New time confirmed." }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.reschedule[0].payload.datetime, "2026-10-04T10:00:00+01:00");
  assert.equal(calls.email[0].templateKind, "rescheduled");
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("dashboard availability keeps the current appointment out of the slot conflict check", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler } = loadHandler();
  const req = Readable.from([]);
  req.method = "GET";
  req.headers = { "x-finbar-admin-key": "fin-key" };
  req.query = { id: "APT-1", date: "2026-10-04" };
  const res = response();
  await handler(req, res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.times.length, 1);
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("dashboard does not email a client when Acuity rejects a stale reschedule slot", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const staleSlot = new Error("That time is no longer available.");
  staleSlot.statusCode = 409;
  const { handler, calls, ledger } = loadHandler({ rescheduleError: staleSlot });
  const res = response();
  await handler(request({ action: "reschedule", appointmentId: "APT-1", datetime: "2026-10-04T10:00:00+01:00" }), res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 409);
  assert.equal(body.error, "That time is no longer available.");
  assert.equal(calls.email.length, 0);
  assert.equal(ledger.actions[0].result, "failed");
  assert.equal(ledger.actions[0].emailSent, false);
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("dashboard cancellation does not create refund or package-credit actions", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, calls } = loadHandler();
  const res = response();
  await handler(request({ action: "cancel", appointmentId: "APT-1", note: "Family requested cancellation." }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.cancel.length, 1);
  assert.equal(calls.email[0].templateKind, "canceled");
  assert.equal(Object.hasOwn(calls.cancel[0].payload, "refund"), false);
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});
