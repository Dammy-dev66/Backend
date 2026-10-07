const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { requireAdminKey } = require("../lib/admin-auth");
const { defaultTemplates, interpolateTemplate, normalizeTemplateState } = require("../lib/email-templates");
const { defaultProofreadingTemplates, interpolateProofreadingTemplate, normalizeProofreadingTemplateState } = require("../lib/proofreading-email-templates");
const { buildPricingServices, buildProofreadingEmail, handleDashboardResource } = require("../lib/admin-dashboard-api");
const { defaultPriceState } = require("../lib/price-config");
const { buildEmailHtml, sendNotificationEmails } = require("../lib/receipt-email");
const { buildOperationsSummary, historyStart, normalizeAppointment } = require("../lib/operations");
const { defaultLedger, normalizeLedger, recordAction, recordAppointment, recordReceipt, upsertPackage } = require("../lib/operations-ledger");
const { isSessionPaid } = require("../lib/stripe");

test("admin operations require the configured Fin-only key", () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "correct-key";
  assert.throws(() => requireAdminKey({ headers: {} }), /Unauthorized/);
  assert.doesNotThrow(() => requireAdminKey({ headers: { "x-finbar-admin-key": "correct-key" } }));
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY;
  else process.env.FINBAR_ADMIN_KEY = previous;
});

test("pricing reconciliation keeps subject mappings and never treats a missing Acuity price as zero", () => {
  const pricing = defaultPriceState();
  pricing.subjectPrices.psychology = { oneToOne: { ...pricing.prices.oneToOne, single: 85 }, oneToTwo: { ...pricing.prices.oneToTwo } };
  const config = { services: [
    { id: "psych-single", subjectId: "psychology", subjectName: "AP Psychology", format: "oneToOne", tier: "single", appointmentTypeID: "101" },
    { id: "english-single", subjectId: "english", subjectName: "English", format: "oneToOne", tier: "single", appointmentTypeID: "102" },
    { id: "english-trial", subjectId: "english", subjectName: "English", format: "oneToOne", tier: "trial", appointmentTypeID: "103" }
  ] };
  const services = buildPricingServices(pricing, config, [
    { id: 101, price: "80.00" },
    { id: 102, price: String(pricing.prices.oneToOne.single) },
    { id: 103, price: "" }
  ]);
  assert.equal(services[0].subjectId, "psychology");
  assert.equal(services[0].websitePrice, 85);
  assert.equal(services[0].matchesAcuity, false);
  assert.equal(services[1].matchesAcuity, true);
  assert.equal(services[2].acuityPrice, null);
  assert.equal(services[2].matchesAcuity, null);
});

test("pricing admin endpoint rejects a blank subject price before writing", async () => {
  const previousKey = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "pricing-test-key";
  const pricing = defaultPriceState();
  pricing.subjectPrices.psychology = JSON.parse(JSON.stringify(pricing.prices));
  pricing.subjectPrices.psychology.oneToOne.single = "";
  const req = Readable.from([Buffer.from(JSON.stringify(pricing))]);
  req.method = "PUT";
  req.headers = { "x-finbar-admin-key": "pricing-test-key" };
  const res = {
    statusCode: 0,
    body: "",
    writeHead(statusCode) { this.statusCode = statusCode; return this; },
    end(body) { this.body = String(body || ""); return this; }
  };
  try {
    await handleDashboardResource(req, res, "pricing");
    assert.equal(res.statusCode, 400);
    assert.match(JSON.parse(res.body).error, /psychology: oneToOne single/);
  } finally {
    if (previousKey === undefined) delete process.env.FINBAR_ADMIN_KEY;
    else process.env.FINBAR_ADMIN_KEY = previousKey;
  }
});

test("email templates retain safe defaults and interpolate only approved variables", () => {
  const templates = normalizeTemplateState({ templates: { booking: { heading: "Hello {recipientName}" } } });
  assert.equal(templates.templates.booking.heading, "Hello {recipientName}");
  assert.equal(templates.templates.package.ctaLabel, defaultTemplates().templates.package.ctaLabel);
  assert.equal(interpolateTemplate("Lesson: {subject}", { subject: "English Literature" }), "Lesson: English Literature");
  const html = buildEmailHtml({ heading: "<unsafe>", subject: "<subject>", bookingLink: "https://example.com" });
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /&lt;subject&gt;/);
});

test("proofreading templates retain defaults and render escaped, fixed review actions", () => {
  const state = normalizeProofreadingTemplateState({ templates: { accepted: { message: "Hi {clientName}, work is underway." } } });
  assert.equal(state.templates.accepted.message, "Hi {clientName}, work is underway.");
  assert.equal(state.templates.reviewDocument.ctaLabel, defaultProofreadingTemplates().templates.reviewDocument.ctaLabel);
  assert.equal(interpolateProofreadingTemplate("For {clientName}", { clientName: "Jordan" }), "For Jordan");
  const email = buildProofreadingEmail({
    kind: "reviewDocument",
    template: defaultProofreadingTemplates().templates.reviewDocument,
    data: { clientName: "<Jordan>", documentUrl: "https://files.example.test/work.docx", reference: "PRF-1", token: "token-1", submissionText: "<unsafe>" }
  });
  assert.match(email.subject, /<Jordan>/, "Subject remains plain text and is not HTML escaped.");
  assert.match(email.html, /&lt;Jordan&gt;/);
  assert.match(email.html, /&lt;unsafe&gt;/);
  assert.match(email.html, /action=accept/);
  assert.match(email.html, /action=refuse/);
});

test("operations normalize live appointments and expose package balance badges", () => {
  const ledger = defaultLedger();
  upsertPackage(ledger, { email: "parent@example.com", certificate: "PKG-1", appointmentTypeID: "42", remaining: 4, subject: "AP Psychology" });
  const appointment = normalizeAppointment({ id: 9, email: "parent@example.com", firstName: "Jordan", lastName: "Parent", datetime: "2026-10-02T14:00:00+01:00", appointmentTypeID: 42, calendarID: 7 }, [{ appointmentTypeID: "42", subjectName: "AP Psychology", format: "oneToOne", tier: "pack6" }], ledger);
  assert.equal(appointment.clientName, "Jordan Parent");
  assert.deepEqual(appointment.packageCodes, ["PKG-1"]);
  assert.deepEqual(appointment.packageRemaining, [4]);
  const summary = buildOperationsSummary([appointment]);
  assert.equal(summary.upcoming >= 0, true);
  assert.match(historyStart(), /^\d{4}-\d{2}-\d{2}$/);
});

test("ledger records package purchases, booking use, receipt sends, and dashboard actions", () => {
  const ledger = defaultLedger();
  upsertPackage(ledger, { email: "parent@example.com", certificate: "PKG-1", appointmentTypeID: "42", tier: "pack6" });
  recordAppointment(ledger, { id: "APT-1", email: "parent@example.com", status: "Scheduled" });
  recordReceipt(ledger, { kind: "booking", email: "parent@example.com", appointmentID: "APT-1", sent: true });
  recordAction(ledger, { type: "reschedule", email: "parent@example.com", appointmentID: "APT-1", note: "Family requested a new time." });
  assert.equal(ledger.packages.length, 1);
  assert.equal(ledger.appointments[0].id, "APT-1");
  assert.equal(ledger.receipts[0].sent, true);
  assert.equal(ledger.actions[0].type, "reschedule");
  assert.equal(ledger.actions[0].actor, "Fin");
  assert.equal(ledger.actions[0].result, "completed");
  assert.equal(ledger.backfillVersion, 0);
  assert.equal(ledger.stripeBackfillCursor, "");
});

test("ledger retains numeric Acuity IDs and the newest operational records", () => {
  const ledger = defaultLedger();
  upsertPackage(ledger, { email: "parent@example.com", certificate: "PKG-2", appointmentTypeID: 42, tier: "pack6" });
  recordAppointment(ledger, { id: 42, email: "parent@example.com", status: "Scheduled" });
  recordReceipt(ledger, { kind: "booking", email: "parent@example.com", appointmentID: 42, sent: true });
  assert.equal(ledger.packages[0].appointmentTypeID, "42");
  assert.equal(ledger.appointments[0].id, "42");
  assert.equal(ledger.receipts[0].appointmentID, "42");

  const newestFirst = Array.from({ length: 501 }, (_, index) => ({ id: `event-${500 - index}` }));
  const normalized = normalizeLedger({ ...ledger, actions: newestFirst, stripeEvents: newestFirst, policySnapshots: newestFirst });
  assert.equal(normalized.actions.length, 500);
  assert.equal(normalized.actions[0].id, "event-500");
  assert.equal(normalized.actions.at(-1).id, "event-1");
  assert.equal(normalized.stripeEvents[0].id, "event-500");
  assert.equal(normalized.policySnapshots[0].id, "event-500");
});

test("Stripe backfill checkpoints each page and completes without duplicate receipts", async () => {
  const apiPath = require.resolve("../lib/admin-dashboard-api");
  const stripePath = require.resolve("../lib/stripe");
  const originalApi = require.cache[apiPath];
  const originalStripe = require.cache[stripePath];
  const calls = [];
  const pages = [
    { has_more: true, data: [{ id: "cs_first", created: 1790000000, payment_status: "paid", metadata: { email: "parent@example.com", certificate: "PKG-1", orderID: "ORDER-1", productID: "product-1", appointmentTypeID: "42" } }] },
    { has_more: false, data: [{ id: "cs_second", created: 1790000001, payment_status: "paid", metadata: { email: "parent@example.com", certificate: "PKG-2", orderID: "ORDER-2", productID: "product-2", appointmentTypeID: "42" } }] }
  ];
  delete require.cache[apiPath];
  require.cache[stripePath] = { exports: { isSessionPaid, getStripeClient: () => ({ checkout: { sessions: { list: async (params) => { calls.push(params); return pages[calls.length - 1]; } } } }) } };
  try {
    const { backfillPackages } = require("../lib/admin-dashboard-api");
    const ledger = defaultLedger();
    await backfillPackages(ledger);
    assert.equal(ledger.backfillVersion, 1);
    assert.equal(ledger.stripeBackfillCursor, "cs_first");
    assert.equal(ledger.packages.length, 1);
    await backfillPackages(ledger);
    assert.equal(calls[1].starting_after, "cs_first");
    assert.equal(ledger.backfillVersion, 2);
    assert.equal(ledger.stripeBackfillCursor, "");
    assert.equal(ledger.packages.length, 2);
    assert.equal(ledger.receipts.length, 2);
  } finally {
    delete require.cache[apiPath];
    if (originalApi) require.cache[apiPath] = originalApi;
    if (originalStripe) require.cache[stripePath] = originalStripe; else delete require.cache[stripePath];
  }
});

test("all dashboard email templates are delivered through the existing Make payload", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalWebhook = process.env.MAKE_RECEIPT_WEBHOOK_URL;
  const originalVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  process.env.MAKE_RECEIPT_WEBHOOK_URL = "https://make.example.test/hook";
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true, text: async () => "ok" };
  };
  try {
    for (const kind of ["package", "booking", "rescheduled", "canceled"]) {
      await sendNotificationEmails({ kind, templateKind: kind, customerEmail: "parent@example.com", subject: "English Literature", bookingLink: "https://example.com/book", bookingDate: "1 October" });
    }
    assert.equal(calls.length, 4);
    assert.match(calls[0].subject, /package receipt/i);
    assert.match(calls[1].subject, /booking confirmed/i);
    assert.match(calls[2].subject, /rescheduled/i);
    assert.match(calls[3].subject, /canceled/i);
    calls.forEach((payload) => {
      assert.equal(payload.to, "parent@example.com");
      assert.match(payload.html, /Finbar B\. Elite Tutoring/);
      assert.match(payload.html, /href="https:\/\/backend-ymlj\.vercel\.app\//);
    });
  } finally {
    global.fetch = originalFetch;
    if (originalWebhook === undefined) delete process.env.MAKE_RECEIPT_WEBHOOK_URL; else process.env.MAKE_RECEIPT_WEBHOOK_URL = originalWebhook;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;
  }
});
