const test = require("node:test");
const assert = require("node:assert/strict");

const { isValidProfileToken, profileToken } = require("../lib/package-profile");

test("package profile token is valid only for its original package link", () => {
  const originalSecret = process.env.PACKAGE_PROFILE_SIGNING_SECRET;
  process.env.PACKAGE_PROFILE_SIGNING_SECRET = "test-profile-secret";

  try {
    const input = {
      orderID: "cs_test_123",
      certificate: "ABCD1234",
      email: "parent@example.com"
    };
    const token = profileToken(input);

    assert.ok(token);
    assert.equal(isValidProfileToken({ ...input, token }), true);
    assert.equal(isValidProfileToken({ ...input, email: "other@example.com", token }), false);
    assert.equal(isValidProfileToken({ ...input, certificate: "WXYZ1234", token }), false);
  } finally {
    if (originalSecret === undefined) delete process.env.PACKAGE_PROFILE_SIGNING_SECRET;
    else process.env.PACKAGE_PROFILE_SIGNING_SECRET = originalSecret;
  }
});
