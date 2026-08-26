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
  const receiptPath = require.resolve("../lib/receipt-email");
  const handlerPath = require.resolve("../api/webhooks/stripe");
  delete require.cache[receiptPath];
  delete require.cache[handlerPath];
  require.cache[receiptPath] = { exports: stub };
  return require("../api/webhooks/stripe");
}

function loadHandlerWithStubs({ receiptStub, acuityStub }) {
  const receiptPath = require.resolve("../lib/receipt-email");
  const acuityPath = require.resolve("../lib/acuity");
  const handlerPath = require.resolve("../api/webhooks/stripe");
  delete require.cache[receiptPath];
  delete require.cache[acuityPath];
  delete require.cache[handlerPath];
  require.cache[receiptPath] = { exports: receiptStub };
  require.cache[acuityPath] = { exports: acuityStub };
  return require("../api/webhooks/stripe");
}

test("stripe webhook sends the package receipt after checkout completion", async () => {
  const calls = [];
  const handler = loadHandlerWithStub({
    sendPackageReceiptEmails: async (payload) => {
      calls.push(payload);
      return { sent: true, provider: "make", bookingLink: "https://example.com" };
    }
  });

  const event = {
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        amount_total: 26400,
        customer_details: {
          email: "student@example.com",
          name: "Joshua"
        },
        metadata: {
          subject: "AP Psychology",
          format: "oneToOne",
          tier: "pack6",
          appointmentTypeID: "95402039",
          productID: "2253280",
          email: "student@example.com",
          backUrl: "https://finbrady.carrd.co/",
          couponCode: "FIN10",
          totalPrice: "264",
          orderID: "ORDER-9"
        }
      }
    }
  };

  const req = Readable.from([Buffer.from(JSON.stringify(event))]);
  req.method = "POST";
  req.headers = {};

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.handled, true);
  assert.equal(body.kind, "package");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].customerEmail, "student@example.com");
  assert.equal(calls[0].productID, "2253280");
  assert.equal(calls[0].orderID, "ORDER-9");
  assert.equal(calls[0].recipientName, "Joshua");
});

test("stripe webhook creates the appointment and sends the booking confirmation for direct bookings", async () => {
  const appointmentCalls = [];
  const receiptCalls = [];
  const originalUserId = process.env.ACUITY_USER_ID;
  const originalApiKey = process.env.ACUITY_API_KEY;
  process.env.ACUITY_USER_ID = "123";
  process.env.ACUITY_API_KEY = "abc";

  const handler = loadHandlerWithStubs({
    receiptStub: {
      sendBookingConfirmationEmails: async (payload) => {
        receiptCalls.push(payload);
        return { sent: true, provider: "make", bookingLink: "https://example.com/book-again" };
      }
    },
    acuityStub: {
      createAppointment: async (payload) => {
        appointmentCalls.push(payload);
        return { id: "APT-1" };
      },
      createCertificate: async () => {
        throw new Error("certificate should not be created for direct bookings");
      },
      extractCertificateCode: () => ""
    }
  });

  const event = {
    id: "evt_2",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_456",
        amount_total: 5000,
        customer_details: {
          email: "student@example.com",
          name: "Joshua"
        },
        metadata: {
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
          studentName2: "Second Student",
          studentFieldID: "18796496",
          notes: "Please be on time",
          timezone: "Europe/Dublin",
          totalPrice: "50",
          orderID: "ORDER-10"
        }
      }
    }
  };

  const req = Readable.from([Buffer.from(JSON.stringify(event))]);
  req.method = "POST";
  req.headers = {};

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.kind, "booking");
  assert.equal(body.appointmentCreated, true);
  assert.equal(body.certificateCreated, false);
  assert.equal(appointmentCalls.length, 1);
  assert.equal(receiptCalls.length, 1);
  assert.equal(receiptCalls[0].customerEmail, "student@example.com");
  assert.equal(receiptCalls[0].recipientName, "Jane");
  assert.equal(appointmentCalls[0].notes.includes("Student 2: Second Student"), true);

  process.env.ACUITY_USER_ID = originalUserId;
  process.env.ACUITY_API_KEY = originalApiKey;
});
