const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { appointmentAccessToken, isValidAppointmentAccess } = require("../lib/appointment-access");

test("appointment access tokens expire and remain scoped to appointment and email", () => {
  const previousSecret = process.env.APPOINTMENT_ACCESS_SECRET;
  process.env.APPOINTMENT_ACCESS_SECRET = "appointment-access-test-secret";
  const now = Date.UTC(2026, 0, 1);

  try {
    const token = appointmentAccessToken("APT-123", "Student@example.com", now);
    assert.match(token, /^v2\./);
    assert.equal(isValidAppointmentAccess("APT-123", "student@example.com", token, now), true);
    assert.equal(isValidAppointmentAccess("APT-124", "student@example.com", token, now), false);
    assert.equal(isValidAppointmentAccess("APT-123", "other@example.com", token, now), false);
    assert.equal(isValidAppointmentAccess("APT-123", "student@example.com", token, now + 401 * 24 * 60 * 60 * 1000), false);
  } finally {
    if (previousSecret === undefined) delete process.env.APPOINTMENT_ACCESS_SECRET;
    else process.env.APPOINTMENT_ACCESS_SECRET = previousSecret;
  }
});

test("legacy appointment links remain valid during migration", () => {
  const previousSecret = process.env.APPOINTMENT_ACCESS_SECRET;
  process.env.APPOINTMENT_ACCESS_SECRET = "appointment-access-test-secret";

  try {
    const legacyToken = crypto.createHmac("sha256", process.env.APPOINTMENT_ACCESS_SECRET)
      .update("APT-OLD|student@example.com")
      .digest("base64url");
    assert.equal(isValidAppointmentAccess("APT-OLD", "student@example.com", legacyToken), true);
  } finally {
    if (previousSecret === undefined) delete process.env.APPOINTMENT_ACCESS_SECRET;
    else process.env.APPOINTMENT_ACCESS_SECRET = previousSecret;
  }
});
