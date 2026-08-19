const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractCertificateCode,
  normalizeCertificateList
} = require("../lib/acuity");

test("normalizes certificate list shapes", () => {
  assert.deepEqual(normalizeCertificateList([{ certificate: "ABC" }]), [{ certificate: "ABC" }]);
  assert.deepEqual(normalizeCertificateList({ certificates: [{ code: "DEF" }] }), [{ code: "DEF" }]);
  assert.deepEqual(normalizeCertificateList({ results: [{ id: "GHI" }] }), [{ id: "GHI" }]);
});

test("extracts a certificate code from common response shapes", () => {
  assert.equal(extractCertificateCode({ certificate: "ABC123" }), "ABC123");
  assert.equal(extractCertificateCode({ code: "DEF456" }), "DEF456");
  assert.equal(extractCertificateCode({ id: 789 }), "789");
  assert.equal(extractCertificateCode("XYZ"), "XYZ");
});
