const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const handlerPath = require.resolve("../api/resolve-package");
const acuityPath = require.resolve("../lib/acuity");
const stripePath = require.resolve("../lib/stripe");
const { profileToken } = require("../lib/package-profile");

function response() {
  return {
    statusCode: 0,
    body: "",
    writeHead(code) { this.statusCode = code; },
    end(body) { this.body = body || ""; }
  };
}

test("resolve-package accepts a package code without an email", async () => {
  delete require.cache[acuityPath];
  delete require.cache[handlerPath];
  let checked;
  require.cache[acuityPath] = { exports: {
    checkCertificate: async (input) => { checked = input; return { remaining: 4 }; },
    resolvePackageCertificate: async () => { throw new Error("email lookup should not run"); }
  }};

  const handler = require("../api/resolve-package");
  const req = Readable.from([Buffer.from(JSON.stringify({
    certificate: "3535CF7E",
    appointmentTypeID: 96938926
  }))]);
  req.method = "POST";
  req.headers = {};
  const res = response();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(checked, { certificate: "3535CF7E", appointmentTypeID: 96938926, email: "" });
  assert.deepEqual(JSON.parse(res.body).certificate, { remaining: 4, code: "3535CF7E" });
});

test("resolve-package returns saved details only for the signed receipt link", async () => {
  const originalSecret = process.env.PACKAGE_PROFILE_SIGNING_SECRET;
  process.env.PACKAGE_PROFILE_SIGNING_SECRET = "test-profile-secret";
  delete require.cache[acuityPath];
  delete require.cache[stripePath];
  delete require.cache[handlerPath];

  require.cache[acuityPath] = { exports: {
    checkCertificate: async () => ({ remaining: 3 }),
    resolvePackageCertificate: async () => { throw new Error("email lookup should not run"); }
  }};
  require.cache[stripePath] = { exports: {
    getStripeClient: () => ({
      checkout: {
        sessions: {
          retrieve: async () => ({
            payment_status: "paid",
            metadata: {
              certificate: "3535CF7E",
              email: "parent@example.com",
              firstName: "Parent",
              lastName: "Example",
              phone: "+353 1 555 0100",
              studentName: "Student One",
              studentName2: "Student Two",
              notes: "Exam preparation"
            }
          })
        }
      }
    })
  }};

  try {
    const token = profileToken({
      orderID: "cs_test_123",
      certificate: "3535CF7E",
      email: "parent@example.com"
    });
    const handler = require("../api/resolve-package");
    const req = Readable.from([Buffer.from(JSON.stringify({
      certificate: "3535CF7E",
      email: "parent@example.com",
      appointmentTypeID: 96938926,
      orderID: "cs_test_123",
      profileToken: token
    }))]);
    req.method = "POST";
    req.headers = {};
    const res = response();
    await handler(req, res);

    const body = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(body.profile.firstName, "Parent");
    assert.equal(body.profile.studentName2, "Student Two");
    assert.equal(body.profile.notes, "Exam preparation");
  } finally {
    delete require.cache[handlerPath];
    delete require.cache[acuityPath];
    delete require.cache[stripePath];
    if (originalSecret === undefined) delete process.env.PACKAGE_PROFILE_SIGNING_SECRET;
    else process.env.PACKAGE_PROFILE_SIGNING_SECRET = originalSecret;
  }
});
