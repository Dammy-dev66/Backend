const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeObject, mergeRecords } = require("../public/admin-merge");

test("dashboard pricing merge preserves concurrent changes to separate prices", () => {
  const base = { prices: { oneToOne: { single: 60, pack6: 300 } }, popup: { heading: "Book" } };
  const draft = { prices: { oneToOne: { single: 65, pack6: 300 } }, popup: { heading: "Book" } };
  const latest = { prices: { oneToOne: { single: 60, pack6: 330 } }, popup: { heading: "Book" } };
  assert.deepEqual(mergeObject(base, draft, latest, "Pricing"), {
    prices: { oneToOne: { single: 65, pack6: 330 } },
    popup: { heading: "Book" }
  });
});

test("dashboard pricing merge reports an overlapping field while preserving the draft", () => {
  const base = { prices: { oneToOne: { single: 60 } } };
  const draft = { prices: { oneToOne: { single: 65 } } };
  const latest = { prices: { oneToOne: { single: 70 } } };
  assert.throws(() => mergeObject(base, draft, latest, "Pricing"), /newer edit.*prices\.oneToOne\.single/i);
});

test("dashboard save merges non-overlapping edits into the latest record", () => {
  const base = [{ id: "english", name: "English", label: "English", active: true }];
  const draft = [{ ...base[0], label: "Literary Classics" }];
  const latest = [{ ...base[0], name: "English Literature" }];
  assert.deepEqual(mergeRecords(base, draft, latest, "id", ["name", "label", "active"], "Subject"), [
    { id: "english", name: "English Literature", label: "Literary Classics", active: true }
  ]);
});

test("dashboard save rejects overlapping edits without losing the draft", () => {
  const base = [{ id: "english", name: "English", label: "English", active: true }];
  const draft = [{ ...base[0], label: "Literary Classics" }];
  const latest = [{ ...base[0], label: "English Classics" }];
  assert.throws(
    () => mergeRecords(base, draft, latest, "id", ["name", "label", "active"], "Subject"),
    /newer edit to the same field.*draft is still on screen/i
  );
});

test("dashboard save keeps independent new records from both editors", () => {
  const base = [{ id: "english", name: "English" }];
  const draft = [...base, { id: "psychology", name: "Psychology" }];
  const latest = [...base, { id: "history", name: "History" }];
  assert.deepEqual(mergeRecords(base, draft, latest, "id", ["name"], "Subject"), [
    { id: "psychology", name: "Psychology" },
    ...latest
  ]);
});
