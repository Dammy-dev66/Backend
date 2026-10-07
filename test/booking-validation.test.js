const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const packageJson = require("../package.json");
const handlerPath = require.resolve("../api-handlers/book-with-package");
const acuityPath = require.resolve("../lib/acuity");
const receiptPath = require.resolve("../lib/receipt-email");
const ledgerPath = require.resolve("../lib/operations-ledger");
const ledgerFunctions = require("../lib/operations-ledger");

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
  return require("../api-handlers/book-with-package");
}

function loadPackageBookingHandler({ ledger, acuity, sendBookingConfirmationEmails, updateLedger }) {
  delete require.cache[acuityPath];
  delete require.cache[receiptPath];
  delete require.cache[ledgerPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: acuity };
  require.cache[ledgerPath] = { exports: {
    ...ledgerFunctions,
    readLedger: async () => ledger,
    updateLedger: updateLedger || (async (mutator) => { await mutator(ledger); return ledger; })
  }};
  require.cache[receiptPath] = { exports: { sendBookingConfirmationEmails } };
  return require("../api-handlers/book-with-package");
}

function packageBookingRequest(lessonTime) {
  const req = Readable.from([Buffer.from(JSON.stringify({
    datetime: lessonTime,
    appointmentTypeID: 95402039,
    firstName: "Jane",
    lastName: "Parent",
    email: "parent@example.com",
    certificate: "PACKAGE-CODE",
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    notifyCustomer: true
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://finbrady.carrd.co" };
  return req;
}

test("package.json exposes a testable Vercel Node project", () => {
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.engines.node, />=20/);
});

test("book-with-package advertises full price fallback when enabled and a package is invalid", async () => {
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
    datetime: lessonTime,
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
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const ledger = ledgerFunctions.defaultLedger();
  delete require.cache[acuityPath];
  delete require.cache[receiptPath];
  delete require.cache[ledgerPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: {
    checkCertificate: async () => ({ remaining: 3 }),
    createAppointment: async () => ({ id: 42 }),
    listAvailabilityTimes: async () => [{ time: lessonTime }]
  }};
  require.cache[ledgerPath] = { exports: {
    ...ledgerFunctions,
    readLedger: async () => ledger,
    updateLedger: async (mutator) => { await mutator(ledger); return ledger; }
  }};
  require.cache[receiptPath] = { exports: {
    sendBookingConfirmationEmails: async (input) => {
      calls.push(input);
      return { sent: true };
    }
  }};
  const handler = require("../api-handlers/book-with-package");
  const req = Readable.from([Buffer.from(JSON.stringify({
    datetime: lessonTime,
    appointmentTypeID: 95402039,
    firstName: "Jane",
    lastName: "Parent",
    email: "parent@example.com",
    certificate: "3535CF7E",
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    notifyCustomer: true,
    totalPrice: "0.01"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://finbrady.carrd.co" };
  const res = makeResponse();
  await handler(req, res);

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 201);
  assert.equal(body.remaining, 3);
  assert.equal(calls.length, 1);
  assert.equal(Object.hasOwn(calls[0], "totalPrice"), false, "A browser-supplied amount must not appear in a package redemption email.");
  assert.match(calls[0].intro, /3 sessions remaining/i);
  assert.equal(calls[0].ctaLabel, "Book remaining sessions");
});

test("a package lesson after the original expiry is rejected before checking availability", async () => {
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const purchasedAt = new Date(Date.now() - 13 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const ledger = ledgerFunctions.defaultLedger();
  ledger.packages.push({
    certificate: "EXPIRED-PACKAGE",
    email: "parent@example.com",
    purchasedAt,
    tier: "pack6"
  });
  delete require.cache[acuityPath];
  delete require.cache[receiptPath];
  delete require.cache[ledgerPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: {
    listAvailabilityTimes: async () => { throw new Error("availability must not be checked"); },
    checkCertificate: async () => { throw new Error("certificate must not be checked"); },
    createAppointment: async () => { throw new Error("appointment must not be created"); }
  }};
  require.cache[ledgerPath] = { exports: {
    ...ledgerFunctions,
    readLedger: async () => ledger
  }};

  const handler = require("../api-handlers/book-with-package");
  const req = Readable.from([Buffer.from(JSON.stringify({
    datetime: lessonTime,
    appointmentTypeID: 95402039,
    firstName: "Jane",
    lastName: "Parent",
    email: "parent@example.com",
    certificate: "EXPIRED-PACKAGE"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://finbrady.carrd.co" };
  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /package expires/i);
});

test("email failure after Acuity creates a lesson cannot turn the booking into a duplicate retry", async () => {
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const ledger = ledgerFunctions.defaultLedger();
  let createCalls = 0;
  let emailCalls = 0;
  const handler = loadPackageBookingHandler({
    ledger,
    acuity: {
      checkCertificate: async () => ({ remaining: 2 }),
      listAvailabilityTimes: async () => [{ time: lessonTime }],
      createAppointment: async () => { createCalls += 1; return { id: 42 }; }
    },
    sendBookingConfirmationEmails: async () => { emailCalls += 1; throw new Error("email unavailable"); }
  });

  const first = makeResponse();
  await handler(packageBookingRequest(lessonTime), first);
  assert.equal(first.statusCode, 201);
  assert.equal(JSON.parse(first.body).needsReview, true);
  assert.equal(ledger.appointments[0].id, "42");
  assert.equal(ledger.actions[0].result, "completed_followup_failed");

  const retry = makeResponse();
  await handler(packageBookingRequest(lessonTime), retry);
  assert.equal(retry.statusCode, 200);
  assert.equal(JSON.parse(retry.body).alreadyBooked, true);
  assert.equal(JSON.parse(retry.body).needsReview, true);
  assert.equal(createCalls, 1);
  assert.equal(emailCalls, 1);
});

test("an uncertain Acuity booking outcome remains reserved for manual reconciliation", async () => {
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const ledger = ledgerFunctions.defaultLedger();
  let createCalls = 0;
  const handler = loadPackageBookingHandler({
    ledger,
    acuity: {
      checkCertificate: async () => ({ remaining: 2 }),
      listAvailabilityTimes: async () => [{ time: lessonTime }],
      createAppointment: async () => { createCalls += 1; throw new Error("network disconnected"); }
    },
    sendBookingConfirmationEmails: async () => { throw new Error("email must not be sent"); }
  });

  const first = makeResponse();
  await handler(packageBookingRequest(lessonTime), first);
  assert.equal(first.statusCode, 409);
  assert.equal(JSON.parse(first.body).needsReview, true);
  assert.equal(ledger.actions[0].result, "started");

  const retry = makeResponse();
  await handler(packageBookingRequest(lessonTime), retry);
  assert.equal(retry.statusCode, 409);
  assert.equal(JSON.parse(retry.body).needsReview, true);
  assert.equal(createCalls, 1);
});

test("a ledger failure after Acuity booking reports the confirmed lesson without a duplicate retry", async () => {
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const ledger = ledgerFunctions.defaultLedger();
  let writes = 0;
  let createCalls = 0;
  const handler = loadPackageBookingHandler({
    ledger,
    acuity: {
      checkCertificate: async () => ({ remaining: 2 }),
      listAvailabilityTimes: async () => [{ time: lessonTime }],
      createAppointment: async () => { createCalls += 1; return { id: 43 }; }
    },
    sendBookingConfirmationEmails: async () => ({ accepted: true }),
    updateLedger: async (mutator) => {
      writes += 1;
      if (writes === 2) throw new Error("storage unavailable");
      await mutator(ledger);
      return ledger;
    }
  });

  const first = makeResponse();
  await handler(packageBookingRequest(lessonTime), first);
  assert.equal(first.statusCode, 201);
  assert.equal(JSON.parse(first.body).appointment.id, 43);
  assert.equal(JSON.parse(first.body).needsReview, true);
  assert.equal(ledger.actions[0].result, "started");

  const retry = makeResponse();
  await handler(packageBookingRequest(lessonTime), retry);
  assert.equal(retry.statusCode, 409);
  assert.equal(createCalls, 1);
});
