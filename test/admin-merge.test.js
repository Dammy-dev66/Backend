const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeRecords } = require("../public/admin-merge");

const fields = ["name", "active"];

test("admin merge preserves a concurrent change to a different field", () => {
  const base = [{ id: "english", name: "English", active: true }];
  const draft = [{ id: "english", name: "Literary Classics", active: true }];
  const latest = [{ id: "english", name: "English", active: false }];

  assert.deepEqual(mergeRecords(base, draft, latest, "id", fields, "Subject"), [
    { id: "english", name: "Literary Classics", active: false }
  ]);
});

test("admin merge refuses to overwrite a concurrent change to the same field", () => {
  const base = [{ id: "english", name: "English", active: true }];
  const draft = [{ id: "english", name: "Literary Classics", active: true }];
  const latest = [{ id: "english", name: "English Literature", active: true }];

  assert.throws(
    () => mergeRecords(base, draft, latest, "id", fields, "Subject"),
    /newer edit to the same field/
  );
});

test("admin merge allows unrelated additions and deletions to be saved", () => {
  const base = [
    { id: "english", name: "English", active: true },
    { id: "psychology", name: "Psychology", active: true }
  ];
  const draft = [
    { id: "english", name: "English", active: true },
    { id: "history", name: "History", active: true }
  ];
  const latest = [
    { id: "english", name: "English", active: true },
    { id: "psychology", name: "Psychology", active: true },
    { id: "biology", name: "Biology", active: true }
  ];

  const merged = mergeRecords(base, draft, latest, "id", fields, "Subject");
  assert.deepEqual(merged.map((record) => record.id).sort(), ["biology", "english", "history"]);
  assert.equal(merged.find((record) => record.id === "psychology"), undefined);
});
