const { corsHeaders, handleOptions, readJson } = require("../../lib/http");
const { requireAdminKey } = require("../../lib/admin-auth");
const { readBookingConfig, writeBookingConfig } = require("../../lib/booking-config");
const { normalizePriceState, readPriceState, validatePriceStateInput, writePriceState } = require("../../lib/price-config");
const { normalizeCouponState, readCouponState, writeCouponState } = require("../../lib/coupons");
const { normalizeTemplateState, readTemplateState, writeTemplateState } = require("../../lib/email-templates");
const { normalizeProofreadingTemplateState, readProofreadingTemplateState, writeProofreadingTemplateState } = require("../../lib/proofreading-email-templates");
const { normalizeLedger, readLedger, writeLedger } = require("../../lib/operations-ledger");

function sendJson(req, res, status, body) {
  return res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(req)
  }).end(JSON.stringify(body));
}

function invalidBackup(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

async function restoreSection(section, backup) {
  if (section === "booking") {
    if (!Array.isArray(backup?.booking?.subjects) || !Array.isArray(backup?.booking?.services)) invalidBackup("The backup has no valid booking configuration.");
    const current = await readBookingConfig();
    return writeBookingConfig({ ...backup.booking, _revision: current._revision });
  }
  if (section === "pricing") {
    if (!backup?.pricing || typeof backup.pricing !== "object") invalidBackup("The backup has no valid pricing settings.");
    validatePriceStateInput(backup.pricing);
    const current = await readPriceState();
    return writePriceState({ ...normalizePriceState(backup.pricing), _revision: current._revision });
  }
  if (section === "coupons") {
    if (!Array.isArray(backup?.coupons?.coupons)) invalidBackup("The backup has no valid coupon settings.");
    const current = await readCouponState();
    return writeCouponState({ ...normalizeCouponState(backup.coupons), _revision: current._revision });
  }
  if (section === "tutoringEmails") {
    if (!backup?.tutoringEmails?.templates || typeof backup.tutoringEmails.templates !== "object") invalidBackup("The backup has no valid tutoring email templates.");
    const current = await readTemplateState();
    return writeTemplateState({ ...normalizeTemplateState(backup.tutoringEmails), _revision: current._revision });
  }
  if (section === "proofreadingEmails") {
    if (!backup?.proofreadingEmails?.templates || typeof backup.proofreadingEmails.templates !== "object") invalidBackup("The backup has no valid proofreading email templates.");
    const current = await readProofreadingTemplateState();
    return writeProofreadingTemplateState({ ...normalizeProofreadingTemplateState(backup.proofreadingEmails), _revision: current._revision });
  }
  if (section === "operations") {
    const operations = backup?.operations;
    if (!operations || !["packages", "receipts", "appointments", "actions", "stripeEvents"].every((key) => Array.isArray(operations[key]))) {
      invalidBackup("The backup has no valid operations records.");
    }
    const current = await readLedger();
    return writeLedger({ ...normalizeLedger(operations), _revision: current._revision });
  }
  invalidBackup("Choose a valid backup section.");
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") {
    if (req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    requireAdminKey(req);
    if (req.method === "POST") {
      const contentLength = Number(req.headers?.["content-length"] || 0);
      if (contentLength > 4 * 1024 * 1024) return sendJson(req, res, 413, { ok: false, error: "This backup is too large to restore from the dashboard." });
      const body = await readJson(req, { maxBytes: 4 * 1024 * 1024 });
      if (body.action !== "restore" || body.confirm !== "RESTORE") return sendJson(req, res, 400, { ok: false, error: "Confirm the restore action before continuing." });
      if (body.backup?.schemaVersion !== 1) return sendJson(req, res, 400, { ok: false, error: "This backup format is not supported." });
      const restored = await restoreSection(body.section, body.backup);
      return sendJson(req, res, 200, { ok: true, section: body.section, revision: restored._revision || "" });
    }

    const [booking, pricing, coupons, tutoringEmails, proofreadingEmails, operations] = await Promise.all([
      readBookingConfig(),
      readPriceState(),
      readCouponState(),
      readTemplateState(),
      readProofreadingTemplateState(),
      readLedger()
    ]);
    const date = new Date().toISOString().slice(0, 10);
    const backup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      warning: "Contains private client, booking, and payment records. Store securely. Does not include Carrd or Make configuration, hosting secrets, or raw Stripe credentials.",
      booking: { version: booking.version, subjects: booking.subjects, services: booking.services },
      pricing: { version: pricing.version, currency: pricing.currency, prices: pricing.prices, subjectPrices: pricing.subjectPrices, popup: pricing.popup },
      coupons: { version: coupons.version, coupons: coupons.coupons },
      tutoringEmails: { version: tutoringEmails.version, templates: tutoringEmails.templates },
      proofreadingEmails: { version: proofreadingEmails.version, templates: proofreadingEmails.templates },
      operations: {
        version: operations.version,
        packages: operations.packages,
        receipts: operations.receipts,
        appointments: operations.appointments,
        actions: operations.actions,
        stripeEvents: operations.stripeEvents,
        policySnapshots: operations.policySnapshots,
        lastBackfillAt: operations.lastBackfillAt,
        backfillVersion: operations.backfillVersion,
        stripeBackfillCursor: operations.stripeBackfillCursor,
        backfillError: operations.backfillError
      }
    };
    return res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="finbar-dashboard-backup-${date}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      ...corsHeaders(req)
    }).end(JSON.stringify(backup, null, 2));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendJson(req, res, statusCode, { ok: false, error: error.message });
  }
};
