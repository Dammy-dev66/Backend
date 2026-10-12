const test = require("node:test");
const assert = require("node:assert/strict");
const { filterOperations } = require("../public/operations-view");

const records = [
  { id: "past", date: "2026-10-11", canceled: false },
  { id: "today", date: "2026-10-12", canceled: false },
  { id: "future", date: "2026-10-13", canceled: false },
  { id: "canceled-today", date: "2026-10-12", canceled: true },
  { id: "canceled-past", date: "2026-10-10", status: "Canceled" }
];

test("operations filters separate today's, upcoming, recent, canceled, and all bookings", () => {
  assert.deepEqual(filterOperations(records, "today", "2026-10-12").map((item) => item.id), ["today"]);
  assert.deepEqual(filterOperations(records, "upcoming", "2026-10-12").map((item) => item.id), ["today", "future"]);
  assert.deepEqual(filterOperations(records, "recent", "2026-10-12").map((item) => item.id), ["past"]);
  assert.deepEqual(filterOperations(records, "canceled", "2026-10-12").map((item) => item.id), ["canceled-today", "canceled-past"]);
  assert.equal(filterOperations(records, "all", "2026-10-12").length, records.length);
});

test("unknown operation filter does not accidentally expose records", () => {
  assert.deepEqual(filterOperations(records, "unexpected", "2026-10-12"), []);
});
