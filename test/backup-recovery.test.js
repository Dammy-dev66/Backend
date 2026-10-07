const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");

function response() {
  return {
    statusCode: 0,
    body: "",
    writeHead(code) { this.statusCode = code; return this; },
    end(body) { this.body = String(body || ""); }
  };
}

function request(method, body) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = method;
  req.headers = { "x-finbar-admin-key": "backup-test-key" };
  return req;
}

test("an exported dashboard backup restores every section in isolated local storage", async () => {
  const originalCwd = process.cwd();
  const originalEnv = Object.fromEntries(["FINBAR_ADMIN_KEY", "VERCEL", "VERCEL_ENV"].map((key) => [key, process.env[key]]));
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "finbar-backup-recovery-"));
  const blobPath = require.resolve("@vercel/blob");
  const originalBlob = require.cache[blobPath];
  try {
    process.chdir(directory);
    process.env.FINBAR_ADMIN_KEY = "backup-test-key";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    require.cache[blobPath] = { exports: {
      get: async () => { throw new Error("Blob disabled for isolated recovery test"); },
      put: async () => { throw new Error("Blob disabled for isolated recovery test"); }
    }};

    const { defaultPriceState, readPriceState, writePriceState } = require("../lib/price-config");
    const { defaultBookingConfig, readBookingConfig, writeBookingConfig } = require("../lib/booking-config");
    const { readCouponState, writeCouponState } = require("../lib/coupons");
    const { defaultTemplates, readTemplateState, writeTemplateState } = require("../lib/email-templates");
    const { defaultProofreadingTemplates, readProofreadingTemplateState, writeProofreadingTemplateState } = require("../lib/proofreading-email-templates");
    const { defaultLedger, readLedger, recordAppointment, writeLedger } = require("../lib/operations-ledger");
    const backupHandler = require("../api/admin/backup");
    const original = defaultPriceState();
    original.prices.oneToOne.single = 88.25;
    await writePriceState(original);
    const booking = defaultBookingConfig();
    booking.subjects[0].name = "Original subject name";
    await writeBookingConfig(booking);
    await writeCouponState({ version: 1, coupons: [{ code: "RECOVER10", percent: 10 }] });
    const tutoringEmails = defaultTemplates();
    tutoringEmails.templates.booking.heading = "Original booking heading";
    await writeTemplateState(tutoringEmails);
    const proofreadingEmails = defaultProofreadingTemplates();
    proofreadingEmails.templates.reviewDocument.heading = "Original proofreading heading";
    await writeProofreadingTemplateState(proofreadingEmails);
    const operations = defaultLedger();
    recordAppointment(operations, { id: 123, email: "test@example.com", status: "Scheduled" });
    await writeLedger(operations);

    const exportResponse = response();
    await backupHandler(request("GET"), exportResponse);
    assert.equal(exportResponse.statusCode, 200);
    const backup = JSON.parse(exportResponse.body);
    assert.equal(backup.schemaVersion, 1);
    assert.equal(backup.pricing.prices.oneToOne.single, 88.25);
    assert.equal(backup.booking.subjects[0].name, "Original subject name");
    assert.equal(backup.operations.appointments[0].id, "123");

    await writePriceState({ ...original, prices: { ...original.prices, oneToOne: { ...original.prices.oneToOne, single: 99.25 } } });
    await writeBookingConfig({ ...booking, subjects: booking.subjects.map((item, index) => index === 0 ? { ...item, name: "Changed subject name" } : item) });
    await writeCouponState({ version: 1, coupons: [] });
    await writeTemplateState({ ...tutoringEmails, templates: { ...tutoringEmails.templates, booking: { ...tutoringEmails.templates.booking, heading: "Changed booking heading" } } });
    await writeProofreadingTemplateState({ ...proofreadingEmails, templates: { ...proofreadingEmails.templates, reviewDocument: { ...proofreadingEmails.templates.reviewDocument, heading: "Changed proofreading heading" } } });
    await writeLedger(defaultLedger());
    assert.equal((await readPriceState()).prices.oneToOne.single, 99.25);

    for (const section of ["booking", "pricing", "coupons", "tutoringEmails", "proofreadingEmails", "operations"]) {
      const restoreResponse = response();
      await backupHandler(request("POST", { action: "restore", confirm: "RESTORE", section, backup }), restoreResponse);
      assert.equal(restoreResponse.statusCode, 200, `${section}: ${restoreResponse.body}`);
    }
    assert.equal((await readBookingConfig()).subjects[0].name, "Original subject name");
    assert.equal((await readPriceState()).prices.oneToOne.single, 88.25);
    assert.equal((await readCouponState()).coupons[0].code, "RECOVER10");
    assert.equal((await readTemplateState()).templates.booking.heading, "Original booking heading");
    assert.equal((await readProofreadingTemplateState()).templates.reviewDocument.heading, "Original proofreading heading");
    assert.equal((await readLedger()).appointments[0].id, "123");
  } finally {
    process.chdir(originalCwd);
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (originalBlob) require.cache[blobPath] = originalBlob; else delete require.cache[blobPath];
    const resolved = await fs.realpath(directory);
    const tempRoot = path.resolve(os.tmpdir()).toLowerCase() + path.sep;
    if (!resolved.toLowerCase().startsWith(tempRoot) || !path.basename(resolved).startsWith("finbar-backup-recovery-")) {
      throw new Error("Refusing to remove a recovery-test directory outside the expected temporary path.");
    }
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
