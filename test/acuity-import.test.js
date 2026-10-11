const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAcuityImport } = require("../lib/acuity-import");
const { findPackageMatches, findRelatedPackages, inferLessonDetails, isConnectionUnavailable, isExactPackageProduct, mergeAcuityMapping } = require("../public/acuity-import-rules");

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

test("Acuity connection setup errors are distinguished from unexpected failures", () => {
  assert.equal(isConnectionUnavailable("Acuity is disabled in this test environment until configured."), true);
  assert.equal(isConnectionUnavailable("Acuity is not connected to this environment."), true);
  assert.equal(isConnectionUnavailable("Acuity is not connected. Add the credentials to this deployment."), true);
  assert.equal(isConnectionUnavailable("Acuity request failed with 502."), false);
});

test("updating an Acuity mapping preserves a custom label and an inactive state", () => {
  const existing = {
    id: "service-1", subjectId: "subject-1", format: "oneToOne", tier: "single",
    label: "Custom lesson name", appointmentTypeID: "7", active: false, order: 0,
    calendarID: "4", bookingLink: "https://acuity.example/book", note: "Keep this note"
  };
  const merged = mergeAcuityMapping(existing, {
    id: "service-2", subjectId: "subject-2", format: "oneToOne", tier: "single",
    label: "Default lesson name", appointmentTypeID: "7", productID: "", calendarID: "", order: 9
  });
  assert.equal(merged.id, "service-1");
  assert.equal(merged.label, "Custom lesson name");
  assert.equal(merged.active, false);
  assert.equal(merged.order, 0);
  assert.equal(merged.calendarID, "4");
  assert.equal(merged.bookingLink, "https://acuity.example/book");
  assert.equal(merged.note, "Keep this note");
});

test("changing the lesson format or tier uses a fresh display label", () => {
  const merged = mergeAcuityMapping(
    { id: "service-1", format: "oneToOne", tier: "single", label: "Custom lesson name", active: true },
    { id: "service-2", format: "oneToTwo", tier: "single", label: "Tutor + two students - Single lesson", order: 3 }
  );
  assert.equal(merged.label, "Tutor + two students - Single lesson");
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
  assert.deepEqual(findRelatedPackages(products, "101").map((item) => item.id), ["p6", "p12"]);
  assert.equal(isExactPackageProduct(products[0], "101", 6), true);
  assert.equal(isExactPackageProduct(products[0], "101", 12), false);
  assert.equal(isExactPackageProduct(products[1], "999", 12), false);
  assert.equal(isExactPackageProduct(products[2], "101", 6), false);
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
    assert.match(JSON.parse(response.body).error, /dedicated test account configured with ACUITY_PREVIEW_USER_ID and ACUITY_PREVIEW_API_KEY/);
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
