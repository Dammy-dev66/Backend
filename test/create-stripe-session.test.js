const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { defaultPriceState, policyVersion } = require("../lib/price-config");

const currentPolicyVersion = policyVersion(defaultPriceState().popup.policyText);

function makeResponse() {
  return {
    statusCode: 0,
    headers: null,
    body: "",
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    end(body) {
      this.body = body ? body.toString() : "";
    }
  };
}

function loadHandlerWithStub(stub, availableTimes = []) {
  const stripePath = require.resolve("../lib/stripe");
  const acuityPath = require.resolve("../lib/acuity");
  const handlerPath = require.resolve("../api-handlers/create-stripe-session");
  delete require.cache[stripePath];
  delete require.cache[acuityPath];
  delete require.cache[handlerPath];
  require.cache[stripePath] = { exports: stub };
  require.cache[acuityPath] = { exports: {
    hasAcuityCredentials: () => true,
    listAvailabilityTimes: async () => availableTimes
  } };
  return require("../api-handlers/create-stripe-session");
}

test("create-stripe-session includes the exact sessions link on the Stripe success URL", async () => {
  const calls = [];
  const handler = loadHandlerWithStub({
    getStripeClient: () => ({
      checkout: {
        sessions: {
          create: async (payload) => {
            calls.push(payload);
            return { url: "https://stripe.example/session" };
          }
        }
      }
    })
  });

  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "English Literature",
    format: "oneToTwo",
    tier: "pack6",
    appointmentTypeID: "96938926",
    productID: "2260532",
    quotedTotalCents: 36000,
    policyAccepted: true,
    policyVersion: currentPolicyVersion,
    email: "student@example.com",
    backUrl: "https://carrd.example"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200, res.body);
  assert.equal(calls.length, 1);

  const successUrl = new URL(calls[0].success_url);
  assert.equal(successUrl.searchParams.get("subject"), "Literary Classics");
  assert.equal(successUrl.searchParams.get("subjectId"), "english-literature");
  assert.equal(successUrl.searchParams.get("tier"), "pack6");
  assert.equal(successUrl.searchParams.get("step"), "2");
  assert.equal(successUrl.searchParams.get("source"), "stripe");
  const bookingLink = new URL(successUrl.searchParams.get("bookingLink"));
  assert.equal(bookingLink.origin, "https://backend-ymlj.vercel.app");
  assert.equal(bookingLink.searchParams.get("subject"), "Literary Classics");
  assert.equal(bookingLink.searchParams.get("subjectId"), "english-literature");
  assert.equal(bookingLink.searchParams.get("appointmentTypeID"), "96938926");
  assert.equal(bookingLink.searchParams.get("email"), "student@example.com");
  assert.equal(bookingLink.searchParams.get("productID"), "2260532");
  assert.equal(bookingLink.searchParams.get("step"), "2");
});

test("create-stripe-session preserves both student names in Stripe metadata", async () => {
  const calls = [];
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const handler = loadHandlerWithStub({
    getStripeClient: () => ({
      checkout: {
        sessions: {
          create: async (payload) => {
            calls.push(payload);
            return { url: "https://stripe.example/session" };
          }
        }
      }
    })
  }, [{ time: lessonTime }]);

  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "English Literature",
    format: "oneToTwo",
    tier: "single",
    appointmentTypeID: "96938789",
    quotedTotalCents: 7000,
    policyAccepted: true,
    policyVersion: currentPolicyVersion,
    email: "student@example.com",
    firstName: "Parent",
    lastName: "Example",
    phone: "+353 1 555 0100",
    datetime: lessonTime,
    studentName: "Alice Example",
    studentName2: "Ben Example"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200, res.body);
  assert.equal(calls[0].metadata.studentName, "Alice Example");
  assert.equal(calls[0].metadata.studentName2, "Ben Example");
});

test("stale displayed price cannot open a Stripe session", async () => {
  const calls = [];
  const handler = loadHandlerWithStub({
    getStripeClient: () => ({ checkout: { sessions: { create: async (payload) => {
      calls.push(payload);
      return { url: "https://stripe.example/session" };
    } } } })
  });
  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "English Literature",
    format: "oneToTwo",
    tier: "pack6",
    appointmentTypeID: "96938926",
    productID: "2260532",
    email: "student@example.com",
    quotedTotalCents: 35000,
    policyAccepted: true,
    policyVersion: currentPolicyVersion
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };
  const res = makeResponse();
  await handler(req, res);
  assert.equal(res.statusCode, 409, res.body);
  assert.equal(JSON.parse(res.body).code, "PRICE_CHANGED");
  assert.equal(calls.length, 0);
});

test("create-stripe-session requires acceptance of the current policy version", async () => {
  const calls = [];
  const handler = loadHandlerWithStub({
    getStripeClient: () => ({ checkout: { sessions: { create: async (payload) => {
      calls.push(payload);
      return { url: "https://stripe.example/session" };
    } } } })
  });
  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "English Literature",
    format: "oneToTwo",
    tier: "pack6",
    appointmentTypeID: "96938926",
    productID: "2260532",
    quotedTotalCents: 36000,
    email: "student@example.com"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };
  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 400, res.body);
  assert.match(JSON.parse(res.body).error, /accept the current lesson policy/i);
  assert.equal(calls.length, 0);
});
