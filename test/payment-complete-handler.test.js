const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

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

function loadHandlerWithStub(stub) {
  const acuityPath = require.resolve("../lib/acuity");
  const handlerPath = require.resolve("../api/payment-complete");
  delete require.cache[acuityPath];
  delete require.cache[handlerPath];
  require.cache[acuityPath] = { exports: stub };
  return require("../api/payment-complete");
}

test("payment completion creates a certificate when Acuity creds and productID are present", async () => {
  const calls = [];
  const originalUserId = process.env.ACUITY_USER_ID;
  const originalApiKey = process.env.ACUITY_API_KEY;
  process.env.ACUITY_USER_ID = "123";
  process.env.ACUITY_API_KEY = "abc";

  const handler = loadHandlerWithStub({
    createCertificate: async (payload) => {
      calls.push(payload);
      return { id: "CERT-1" };
    },
    createAppointment: async () => ({ id: "APT-IGNORED" })
  });

  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    appointmentTypeID: "95402039",
    email: "student@example.com",
    productID: "2253280",
    totalPrice: "264"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.certificateCreated, true);
  assert.equal(body.certificateDeferred, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { productID: "2253280", email: "student@example.com" });

  process.env.ACUITY_USER_ID = originalUserId;
  process.env.ACUITY_API_KEY = originalApiKey;
});

test("payment completion creates an appointment for direct bookings after payment", async () => {
  const appointmentCalls = [];
  const originalUserId = process.env.ACUITY_USER_ID;
  const originalApiKey = process.env.ACUITY_API_KEY;
  process.env.ACUITY_USER_ID = "123";
  process.env.ACUITY_API_KEY = "abc";

  const handler = loadHandlerWithStub({
    createAppointment: async (payload) => {
      appointmentCalls.push(payload);
      return { id: "APT-1" };
    },
    createCertificate: async () => {
      throw new Error("certificate should not be created for direct bookings");
    }
  });

  const req = Readable.from([Buffer.from(JSON.stringify({
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "trial",
    appointmentTypeID: "95402082",
    email: "student@example.com",
    firstName: "Jane",
    lastName: "Parent",
    phone: "+353123456",
    datetime: "2026-09-01T14:00:00+01:00",
    calendarID: "14289294",
    studentName: "Student Name",
    studentFieldID: "18796496",
    notes: "Please be on time",
    timezone: "Europe/Dublin"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.appointmentCreated, true);
  assert.equal(body.certificateCreated, false);
  assert.equal(appointmentCalls.length, 1);
  assert.deepEqual(appointmentCalls[0], {
    datetime: "2026-09-01T14:00:00+01:00",
    appointmentTypeID: 95402082,
    calendarID: 14289294,
    firstName: "Jane",
    lastName: "Parent",
    email: "student@example.com",
    phone: "+353123456",
    notes: "Please be on time",
    timezone: "Europe/Dublin",
    fields: [{ id: 18796496, value: "Student Name" }]
  });

  process.env.ACUITY_USER_ID = originalUserId;
  process.env.ACUITY_API_KEY = originalApiKey;
});
