const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const handlerPath = require.resolve("../api/resolve-package");
const acuityPath = require.resolve("../lib/acuity");

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
