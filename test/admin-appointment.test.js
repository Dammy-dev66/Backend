const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { receiptDeliveryFields, recordAction, recordAppointment } = require("../lib/operations-ledger");

const appointmentDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
const replacementDate = new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString();

function response() {
  return { statusCode: 0, body: "", writeHead(code) { this.statusCode = code; }, end(body) { this.body = String(body || ""); } };
}

function request(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = { "x-finbar-admin-key": "fin-key" };
  return req;
}

function loadHandler({ rescheduleError, lessonDate = appointmentDate, format = "oneToOne" } = {}) {
  const paths = {
    acuity: require.resolve("../lib/acuity"),
    config: require.resolve("../lib/booking-config"),
    ledger: require.resolve("../lib/operations-ledger"),
    receipt: require.resolve("../lib/receipt-email"),
    handler: require.resolve("../lib/admin-dashboard-api")
  };
  const calls = { reschedule: [], cancel: [], email: [] };
  const ledger = { packages: [], receipts: [], appointments: [], actions: [], stripeEvents: [], backfillVersion: 2 };
  Object.values(paths).forEach((item) => delete require.cache[item]);
  require.cache[paths.acuity] = { exports: {
    checkCertificate: async () => ({ remaining: 0 }),
    getAppointment: async () => ({ id: "APT-1", email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: lessonDate, appointmentTypeID: "42", calendarID: "7", type: "English Literature" }),
    listAppointments: async () => [],
    listAvailabilityTimes: async () => [{ time: replacementDate }],
    rescheduleAppointment: async (id, payload) => {
      calls.reschedule.push({ id, payload });
      if (rescheduleError) throw rescheduleError;
      return { id, email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: payload.datetime, appointmentTypeID: "42", calendarID: "7", type: "English Literature" };
    },
    cancelAppointment: async (id, payload) => { calls.cancel.push({ id, payload }); return { id, email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: lessonDate, appointmentTypeID: "42", calendarID: "7", canceled: true }; }
  } };
  require.cache[paths.config] = { exports: { readBookingConfig: async () => ({ services: [{ appointmentTypeID: "42", subjectName: "English Literature", format, tier: "single" }] }) } };
  require.cache[paths.ledger] = { exports: {
    clientKey: (email) => String(email || "").trim().toLowerCase(),
    readLedger: async () => ledger,
    updateLedger: async (mutator) => { mutator(ledger); return ledger; },
    upsertPackage: (state) => state,
    recordAction,
    recordAppointment,
    recordReceipt: (state, item) => state.receipts.push(item),
    receiptDeliveryFields
  } };
  require.cache[paths.receipt] = { exports: { sendNotificationEmails: async (payload) => { calls.email.push(payload); return { sent: true }; } } };
  const dashboardApi = require("../lib/admin-dashboard-api");
  return {
    handler: (req, res) => dashboardApi.handleDashboardResource(req, res, "appointment"),
    operationsHandler: (req, res) => dashboardApi.handleDashboardResource(req, res, "operations"),
    calls,
    ledger
  };
}

test("dashboard reschedule uses Acuity and sends the branded reschedule email", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, calls } = loadHandler();
  const res = response();
  await handler(request({ action: "reschedule", appointmentId: "APT-1", datetime: replacementDate, note: "New time confirmed." }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.reschedule[0].payload.datetime, replacementDate);
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
  req.query = { id: "APT-1", date: replacementDate.slice(0, 10) };
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
  await handler(request({ action: "reschedule", appointmentId: "APT-1", datetime: replacementDate }), res);
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

test("no-show waits 20 minutes, records Acuity's no-show flag, and blocks a repeat", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const tooSoon = loadHandler({ lessonDate: new Date(Date.now() - 19 * 60 * 1000).toISOString() });
  const early = response();
  await tooSoon.handler(request({ action: "no-show", appointmentId: "APT-1" }), early);
  assert.equal(early.statusCode, 400);
  assert.equal(tooSoon.calls.cancel.length, 0);

  const ready = loadHandler({ lessonDate: new Date(Date.now() - 21 * 60 * 1000).toISOString() });
  const marked = response();
  await ready.handler(request({ action: "no-show", appointmentId: "APT-1" }), marked);
  assert.equal(marked.statusCode, 200);
  assert.equal(ready.calls.cancel[0].payload.noShow, true);
  assert.equal(Object.hasOwn(ready.calls.cancel[0].payload, "refund"), false);
  assert.equal(JSON.parse(marked.body).appointment.status, "No-show", "Ledger status survives a stale Acuity response.");
  assert.equal(ready.ledger.appointments[0].status, "No-show");

  const repeated = response();
  await ready.handler(request({ action: "no-show", appointmentId: "APT-1" }), repeated);
  assert.equal(repeated.statusCode, 409);
  assert.equal(ready.calls.cancel.length, 1);
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("recording email requires a completed two-student lesson and explicit authorization", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const single = loadHandler();
  recordAppointment(single.ledger, { id: "APT-1", email: "parent@example.com", status: "Completed" });
  const wrongFormat = response();
  await single.handler(request({ action: "send-recording", appointmentId: "APT-1", authorized: true, recordingUrl: "https://example.test/lesson", recipientEmail: "student@example.com" }), wrongFormat);
  assert.equal(wrongFormat.statusCode, 400);
  assert.equal(single.calls.email.length, 0);

  const paired = loadHandler({ format: "oneToTwo" });
  recordAppointment(paired.ledger, { id: "APT-1", email: "parent@example.com", status: "Completed" });
  const unauthorized = response();
  await paired.handler(request({ action: "send-recording", appointmentId: "APT-1", recordingUrl: "https://example.test/lesson", recipientEmail: "student@example.com" }), unauthorized);
  assert.equal(unauthorized.statusCode, 400);

  const insecure = response();
  await paired.handler(request({ action: "send-recording", appointmentId: "APT-1", authorized: true, recordingUrl: "http://example.test/lesson", recipientEmail: "student@example.com" }), insecure);
  assert.equal(insecure.statusCode, 400);
  assert.equal(paired.calls.email.length, 0);

  const sent = response();
  await paired.handler(request({ action: "send-recording", appointmentId: "APT-1", authorized: true, recordingUrl: "https://example.test/lesson", recipientEmail: "student@example.com" }), sent);
  assert.equal(sent.statusCode, 200);
  assert.equal(paired.calls.email.length, 1);
  assert.equal(paired.calls.email[0].customerEmail, "student@example.com");
  assert.equal(paired.calls.email[0].copyEmail, "");
  assert.equal(paired.calls.email[0].ctaUrl, "https://example.test/lesson");
  assert.equal(paired.ledger.appointments[0].recordingRecipient, "student@example.com");
  assert.ok(paired.ledger.appointments[0].recordingSentAt);
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("dashboard resend uses the booking template and records the delivery attempt", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, calls, ledger } = loadHandler();
  const res = response();
  await handler(request({ action: "resend", appointmentId: "APT-1" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.email[0].templateKind, "booking");
  assert.equal(ledger.actions[0].type, "resend");
  assert.equal(ledger.receipts[0].kind, "booking");
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("Fin can reconcile a package booking only with a matching Acuity appointment", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, ledger } = loadHandler();
  recordAction(ledger, {
    actionId: "package-booking:confirmed",
    type: "package-booking",
    result: "started",
    email: "parent@example.com",
    appointmentTypeID: "42",
    datetime: appointmentDate,
    certificate: "PKG-1"
  });

  const mismatch = response();
  await handler(request({ action: "reconcile", actionId: "package-booking:confirmed", appointmentId: "WRONG", resolution: "confirmed", note: "Checked client and lesson in Acuity." }), mismatch);
  assert.equal(mismatch.statusCode, 409);
  assert.equal(ledger.actions[0].result, "started");

  const matched = response();
  await handler(request({ action: "reconcile", actionId: "package-booking:confirmed", appointmentId: "APT-1", resolution: "confirmed", note: "Verified this booking in Acuity." }), matched);
  assert.equal(matched.statusCode, 200);
  assert.equal(ledger.actions[0].result, "reconciled");
  assert.equal(ledger.actions[0].appointmentID, "APT-1");
  assert.equal(ledger.appointments[0].id, "APT-1");
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("Fin can release a package attempt only after verifying no Acuity booking exists", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { handler, ledger } = loadHandler();
  recordAction(ledger, {
    actionId: "package-booking:not-booked",
    type: "package-booking",
    result: "started",
    email: "parent@example.com",
    appointmentTypeID: "42",
    datetime: appointmentDate,
    certificate: "PKG-1"
  });

  const res = response();
  await handler(request({ action: "reconcile", actionId: "package-booking:not-booked", resolution: "not-booked", note: "No matching appointment found in Acuity." }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(ledger.actions[0].result, "rejected");
  assert.equal(ledger.actions[0].reconciledBy, "Fin");
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});

test("the Operations review list includes package attempts without appointment IDs", async () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "fin-key";
  const { operationsHandler, ledger } = loadHandler();
  recordAction(ledger, {
    actionId: "package-booking:needs-review",
    type: "package-booking",
    result: "started",
    email: "parent@example.com",
    appointmentTypeID: "42",
    datetime: appointmentDate,
    certificate: "PKG-1"
  });
  const req = Readable.from([]);
  req.method = "GET";
  req.headers = { "x-finbar-admin-key": "fin-key" };
  const res = response();
  await operationsHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).actionIssues[0].type, "package-booking");
  assert.equal(JSON.parse(res.body).actionIssues[0].certificate, "PKG-1");
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY; else process.env.FINBAR_ADMIN_KEY = previous;
});
