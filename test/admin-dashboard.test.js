const test = require("node:test");
const assert = require("node:assert/strict");
const { requireAdminKey } = require("../lib/admin-auth");
const { defaultTemplates, interpolateTemplate, normalizeTemplateState } = require("../lib/email-templates");
const { buildEmailHtml, sendNotificationEmails } = require("../lib/receipt-email");
const { buildOperationsSummary, historyStart, normalizeAppointment } = require("../lib/operations");
const { defaultLedger, recordAction, recordAppointment, recordReceipt, upsertPackage } = require("../lib/operations-ledger");

test("admin operations require the configured Fin-only key", () => {
  const previous = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "correct-key";
  assert.throws(() => requireAdminKey({ headers: {} }), /Unauthorized/);
  assert.doesNotThrow(() => requireAdminKey({ headers: { "x-finbar-admin-key": "correct-key" } }));
  if (previous === undefined) delete process.env.FINBAR_ADMIN_KEY;
  else process.env.FINBAR_ADMIN_KEY = previous;
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

test("all dashboard email templates are delivered through the existing Make payload", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalWebhook = process.env.MAKE_RECEIPT_WEBHOOK_URL;
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
  } finally {
    global.fetch = originalFetch;
    if (originalWebhook === undefined) delete process.env.MAKE_RECEIPT_WEBHOOK_URL; else process.env.MAKE_RECEIPT_WEBHOOK_URL = originalWebhook;
  }
});
