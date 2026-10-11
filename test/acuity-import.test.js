const test = require("node:test");
const assert = require("node:assert/strict");
const { findPackageMatches, inferLessonDetails, normalizeAcuityImport } = require("../lib/acuity-import");

test("Acuity import normalization preserves useful data and treats blank prices as unavailable", () => {
  const normalized = normalizeAcuityImport([
    { id: 101, name: "English - Tutor + two students - 6-class package", price: "", category: "English", duration: "60", calendarIDs: [2, "3"] },
    { id: 102, name: "Trial", price: "25.50", category: "" },
    { name: "Not importable" }
  ], [
    { id: 201, name: "Six lessons", type: "appointments", price: "300", appointmentTypeIDs: [101], appointmentTypeCounts: { 101: 6 } },
    { id: 202, name: "Twelve lessons", type: "appointments", price: "", appointmentTypeIDs: [101], appointmentTypeCounts: { 101: 12 } }
  ]);
  assert.deepEqual(normalized.appointmentTypes[0], {
    id: "101", name: "English - Tutor + two students - 6-class package", description: "", type: "", active: true, duration: 60,
    price: null, category: "English", calendarIDs: ["2", "3"]
  });
  assert.equal(normalized.appointmentTypes[1].price, 25.5);
  assert.equal(normalized.appointmentTypes.length, 2);
  assert.equal(normalized.products[1].price, null);
});

test("Acuity name suggestions identify format and tier without guessing an unknown tier", () => {
  assert.deepEqual(inferLessonDetails("Tutor + two students - 12-class package"), { format: "oneToTwo", tier: "pack12" });
  assert.deepEqual(inferLessonDetails("AP Psychology - one student - single lesson"), { format: "oneToOne", tier: "single" });
  assert.deepEqual(inferLessonDetails("English session"), { format: "", tier: "" });
});

test("package matching requires an Acuity appointment product linked to the exact lesson count", () => {
  const products = [
    { id: "p6", type: "appointments", appointmentTypeIDs: ["101"], appointmentTypeCounts: { 101: 6 } },
    { id: "p12", type: "appointments", appointmentTypeIDs: ["101"], appointmentTypeCounts: { 101: 12 } },
    { id: "gift", type: "giftCertificate", appointmentTypeIDs: ["101"], appointmentTypeCounts: { 101: 6 } }
  ];
  assert.deepEqual(findPackageMatches(products, 101, 6).map((item) => item.id), ["p6"]);
  assert.deepEqual(findPackageMatches(products, "101", 12).map((item) => item.id), ["p12"]);
  assert.deepEqual(findPackageMatches(products, "101", 3), []);
});

test("protected Acuity import preview reads appointment types and products and never accepts writes", async () => {
  const acuityPath = require.resolve("../lib/acuity");
  const apiPath = require.resolve("../lib/admin-dashboard-api");
  const originalAcuity = require.cache[acuityPath];
  const originalApi = require.cache[apiPath];
  const originalKey = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "acuity-import-test-key";
  let typeReads = 0;
  let productReads = 0;
  require.cache[acuityPath] = { exports: {
    hasAcuityCredentials: () => true,
    listAppointmentTypes: async () => { typeReads += 1; return [{ id: 8, name: "Trial class", price: "20" }]; },
    listProducts: async () => { productReads += 1; return [{ id: 9, name: "6 lessons", price: "200", type: "appointments", appointmentTypeIDs: [8], appointmentTypeCounts: { 8: 6 } }]; }
  } };
  delete require.cache[apiPath];
  const api = require(apiPath);
  const response = () => ({
    statusCode: 0, body: "", headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    writeHead(code) { this.statusCode = code; return this; },
    end(body) { this.body = String(body || ""); return this; }
  });
  try {
    const unauthorized = response();
    await api.handleDashboardResource({ method: "GET", headers: {}, url: "/api/admin/coupons?resource=acuity-import" }, unauthorized, "acuity-import");
    assert.equal(unauthorized.statusCode, 401);
    assert.equal(typeReads, 0);

    const success = response();
    await api.handleDashboardResource({ method: "GET", headers: { "x-finbar-admin-key": "acuity-import-test-key" } }, success, "acuity-import");
    assert.equal(success.statusCode, 200, success.body);
    assert.match(success.headers["Cache-Control"], /no-store/);
    assert.deepEqual(JSON.parse(success.body).appointmentTypes.map((item) => item.id), ["8"]);
    assert.deepEqual(JSON.parse(success.body).products.map((item) => item.id), ["9"]);
    assert.equal(typeReads, 1);
    assert.equal(productReads, 1);

    const write = response();
    await api.handleDashboardResource({ method: "PUT", headers: { "x-finbar-admin-key": "acuity-import-test-key" } }, write, "acuity-import");
    assert.equal(write.statusCode, 405);
    assert.equal(typeReads, 1);
  } finally {
    if (originalKey === undefined) delete process.env.FINBAR_ADMIN_KEY;
    else process.env.FINBAR_ADMIN_KEY = originalKey;
    delete require.cache[apiPath];
    delete require.cache[acuityPath];
    if (originalApi) require.cache[apiPath] = originalApi;
    if (originalAcuity) require.cache[acuityPath] = originalAcuity;
  }
});

test("Acuity import preview reports a missing connection without making upstream calls", async () => {
  const acuityPath = require.resolve("../lib/acuity");
  const apiPath = require.resolve("../lib/admin-dashboard-api");
  const originalAcuity = require.cache[acuityPath];
  const originalApi = require.cache[apiPath];
  const originalKey = process.env.FINBAR_ADMIN_KEY;
  process.env.FINBAR_ADMIN_KEY = "acuity-import-test-key";
  let reads = 0;
  require.cache[acuityPath] = { exports: {
    hasAcuityCredentials: () => false,
    listAppointmentTypes: async () => { reads += 1; return []; },
    listProducts: async () => { reads += 1; return []; }
  } };
  delete require.cache[apiPath];
  try {
    const response = { statusCode: 0, body: "", setHeader() {}, writeHead(code) { this.statusCode = code; }, end(body) { this.body = String(body); } };
    await require(apiPath).handleDashboardResource({ method: "GET", headers: { "x-finbar-admin-key": "acuity-import-test-key" } }, response, "acuity-import");
    assert.equal(response.statusCode, 503);
    assert.match(JSON.parse(response.body).error, /Acuity is not connected/);
    assert.equal(reads, 0);
  } finally {
    if (originalKey === undefined) delete process.env.FINBAR_ADMIN_KEY;
    else process.env.FINBAR_ADMIN_KEY = originalKey;
    delete require.cache[apiPath];
    delete require.cache[acuityPath];
    if (originalApi) require.cache[apiPath] = originalApi;
    if (originalAcuity) require.cache[acuityPath] = originalAcuity;
  }
});
