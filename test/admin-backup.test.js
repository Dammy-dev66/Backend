const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { defaultPriceState, normalizePriceState, validatePriceStateInput } = require("../lib/price-config");

function request(body, key) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = key ? { "x-finbar-admin-key": key } : {};
  return req;
}

function response() {
  return {
    statusCode: 0,
    body: "",
    writeHead(statusCode) { this.statusCode = statusCode; return this; },
    end(body) { this.body = String(body || ""); return this; }
  };
}

test("pricing backup restore requires admin access and the current storage revision", async () => {
  const pricePath = require.resolve("../lib/price-config");
  const backupPath = require.resolve("../api/admin/backup");
  const originalPrice = require.cache[pricePath];
  const originalBackup = require.cache[backupPath];
  const originalKey = process.env.FINBAR_ADMIN_KEY;
  const writes = [];
  let conflict = false;
  const pricing = defaultPriceState();
  pricing.prices.oneToOne.single = 70;
  const body = { action: "restore", confirm: "RESTORE", section: "pricing", backup: { schemaVersion: 1, pricing } };
  try {
    process.env.FINBAR_ADMIN_KEY = "backup-test-key";
    require.cache[pricePath] = { exports: {
      normalizePriceState,
      validatePriceStateInput,
      readPriceState: async () => ({ _revision: "current-revision" }),
      writePriceState: async (state) => {
        writes.push(state);
        if (conflict) {
          const error = new Error("Pricing changed since this restore began.");
          error.statusCode = 409;
          throw error;
        }
        return { ...state, _revision: "restored-revision" };
      }
    } };
    delete require.cache[backupPath];
    const handler = require("../api/admin/backup");

    const denied = response();
    await handler(request(body), denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(writes.length, 0);

    const damaged = { ...body, backup: { schemaVersion: 1, pricing: { ...pricing, prices: { ...pricing.prices, oneToOne: { ...pricing.prices.oneToOne, single: "" } } } } };
    const invalid = response();
    await handler(request(damaged, "backup-test-key"), invalid);
    assert.equal(invalid.statusCode, 400);
    assert.match(JSON.parse(invalid.body).error, /oneToOne single/);
    assert.equal(writes.length, 0);

    const restored = response();
    await handler(request(body, "backup-test-key"), restored);
    assert.equal(restored.statusCode, 200);
    assert.equal(JSON.parse(restored.body).section, "pricing");
    assert.equal(writes.length, 1);
    assert.equal(writes[0]._revision, "current-revision");
    assert.equal(writes[0].prices.oneToOne.single, 70);

    conflict = true;
    const rejected = response();
    await handler(request(body, "backup-test-key"), rejected);
    assert.equal(rejected.statusCode, 409);
    assert.match(JSON.parse(rejected.body).error, /changed since this restore/);
  } finally {
    delete require.cache[backupPath];
    if (originalBackup) require.cache[backupPath] = originalBackup;
    if (originalPrice) require.cache[pricePath] = originalPrice;
    else delete require.cache[pricePath];
    if (originalKey === undefined) delete process.env.FINBAR_ADMIN_KEY;
    else process.env.FINBAR_ADMIN_KEY = originalKey;
  }
});
