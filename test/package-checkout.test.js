const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPackageCheckoutUrl } = require("../api/package-checkout");

test("buildPackageCheckoutUrl keeps the student on the custom checkout bridge", () => {
  const url = buildPackageCheckoutUrl(
  {
      subject: "AP Psychology",
      format: "oneToOne",
      tier: "pack6",
      appointmentTypeID: "95402039",
      productID: "2253280",
      email: "student@example.com",
      backUrl: "https://carrd.example",
      source: "custom-flow",
      datetime: "2026-09-01T14:00:00+01:00",
      calendarID: "14289294",
      firstName: "Jane",
      lastName: "Parent",
      phone: "+353123456",
      studentName: "Student Name",
      studentFieldID: "18796496",
      notes: "Please be on time",
      timezone: "Europe/Dublin"
    },
    "https://backend-ymlj.vercel.app"
  );

  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/checkout.html");
  assert.equal(parsed.searchParams.get("subject"), "AP Psychology");
  assert.equal(parsed.searchParams.get("tier"), "pack6");
  assert.equal(parsed.searchParams.get("source"), "custom-flow");
  assert.equal(parsed.searchParams.get("productID"), "2253280");
  assert.equal(parsed.searchParams.get("datetime"), "2026-09-01T14:00:00+01:00");
  assert.equal(parsed.searchParams.get("calendarID"), "14289294");
  assert.equal(parsed.searchParams.get("firstName"), "Jane");
  assert.equal(parsed.searchParams.get("lastName"), "Parent");
  assert.equal(parsed.searchParams.get("phone"), "+353123456");
  assert.equal(parsed.searchParams.get("studentName"), "Student Name");
  assert.equal(parsed.searchParams.get("studentFieldID"), "18796496");
  assert.equal(parsed.searchParams.get("notes"), "Please be on time");
  assert.equal(parsed.searchParams.get("timezone"), "Europe/Dublin");
  assert.doesNotMatch(url, /catalog\.php/);
});
