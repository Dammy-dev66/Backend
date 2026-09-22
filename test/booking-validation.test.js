const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const packageJson = require("../package.json");
const handlerPath = require.resolve("../api/book-with-package");
const acuityPath = require.resolve("../lib/acuity");
const receiptPath = require.resolve("../lib/receipt-email");

function makeResponse() {
  return {
    statusCode: 0,
    body: "",
    headers: null,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    end(body) {
      this.body = body ? body.toString() : "";
    }
  };
}

function loadHandlerWithStub(stub) {
  delete require.cache[acuityPath];
  delete require.cache[receiptPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: stub };
  return require("../api/book-with-package");
}

test("package.json exposes a testable Vercel Node project", () => {
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.engines.node, />=20/);
});

test("book-with-package advertises full price fallback when enabled and a package is invalid", async () => {
  const original = process.env.ALLOW_FULL_PRICE_FALLBACK;
  process.env.ALLOW_FULL_PRICE_FALLBACK = "true";

  const handler = loadHandlerWithStub({
    resolvePackageCertificate: async () => {
      const error = new Error("certificate invalid");
      error.acuity = { error: "invalid_certificate" };
      throw error;
    },
    checkCertificate: async () => {
      throw new Error("should not be reached");
    },
    createAppointment: async () => {
      throw new Error("should not be reached");
    }
  });

  const req = Readable.from([Buffer.from(JSON.stringify({
    datetime: "2026-09-01T14:00:00+01:00",
    appointmentTypeID: 95402039,
    firstName: "Jane",
    lastName: "Parent",
    email: "student@example.com"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://carrd.example" };

  const res = makeResponse();
  await handler(req, res);

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 500);
  assert.equal(body.ok, false);
  assert.equal(body.canFallbackToFullPrice, true);

  process.env.ALLOW_FULL_PRICE_FALLBACK = original;
});

test("the final package session booking sends one remaining-balance email", async () => {
  const calls = [];
  delete require.cache[acuityPath];
  delete require.cache[receiptPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: {
    checkCertificate: async () => ({ remaining: 3 }),
    createAppointment: async () => ({ id: 42 })
  }};
  require.cache[receiptPath] = { exports: {
    sendBookingConfirmationEmails: async (input) => {
      calls.push(input);
      return { sent: true };
    }
  }};
  const handler = require("../api/book-with-package");
  const req = Readable.from([Buffer.from(JSON.stringify({
    datetime: "2026-09-01T14:00:00+01:00",
    appointmentTypeID: 95402039,
    firstName: "Jane",
    lastName: "Parent",
    email: "parent@example.com",
    certificate: "3535CF7E",
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    notifyCustomer: true,
    totalPrice: "264"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://finbrady.carrd.co" };
  const res = makeResponse();
  await handler(req, res);

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 201);
  assert.equal(body.remaining, 3);
  assert.equal(calls.length, 1);
  assert.match(calls[0].intro, /3 sessions remaining/i);
  assert.equal(calls[0].ctaLabel, "Book remaining sessions");
});
