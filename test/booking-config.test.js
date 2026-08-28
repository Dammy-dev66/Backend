const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSelectionIndex,
  defaultBookingConfig,
  findServiceForSelection,
  normalizeBookingConfig
} = require("../lib/booking-config");

test("default booking config contains the current subject and lesson map", () => {
  const config = defaultBookingConfig();

  assert.equal(config.subjects.length, 5);
  assert.equal(config.services.length, 40);

  const index = buildSelectionIndex(config);
  assert.ok(index["AP Psychology:oneToOne:trial"]);
  assert.equal(index["English Literature:oneToTwo:pack12"].productID, "2260533");
});

test("booking config lookup resolves a subject-specific lesson mapping", () => {
  const config = normalizeBookingConfig(defaultBookingConfig());
  const service = findServiceForSelection(config, {
    subject: "Elegant Essays",
    format: "oneToTwo",
    tier: "pack6"
  });

  assert.ok(service);
  assert.equal(service.appointmentTypeID, "96953156");
  assert.equal(service.productID, "2260522");
});
