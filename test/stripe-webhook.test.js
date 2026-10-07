const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const ledgerFunctions = require("../lib/operations-ledger");

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
  return loadHandlerWithStubs({
    receiptStub: stub,
    acuityStub: {
      createCertificate: async () => ({ id: "CERT-1" }),
      extractCertificateCode: () => "CERT-1"
    }
  });
}

function loadHandlerWithStubs({ receiptStub, acuityStub, ledger = ledgerFunctions.defaultLedger() }) {
  const receiptPath = require.resolve("../lib/receipt-email");
  const acuityPath = require.resolve("../lib/acuity");
  const ledgerPath = require.resolve("../lib/operations-ledger");
  const handlerPath = require.resolve("../api/webhooks/stripe");
  delete require.cache[receiptPath];
  delete require.cache[acuityPath];
  delete require.cache[ledgerPath];
  delete require.cache[handlerPath];
  require.cache[receiptPath] = { exports: receiptStub };
  require.cache[acuityPath] = { exports: { hasAcuityCredentials: () => true, ...acuityStub } };
  require.cache[ledgerPath] = { exports: {
    ...ledgerFunctions,
    readLedger: async () => ledger,
    updateLedger: async (mutator) => { await mutator(ledger); return ledger; }
  } };
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
        created: Math.floor(Date.now() / 1000),
        payment_status: "paid",
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

  const retry = Readable.from([Buffer.from(JSON.stringify(event))]);
  retry.method = "POST";
  retry.headers = {};
  const retryResponse = makeResponse();
  await handler(retry, retryResponse);
  assert.equal(retryResponse.statusCode, 200);
  assert.equal(JSON.parse(retryResponse.body).duplicate, true);
  assert.equal(calls.length, 1);
});

test("failed paid fulfillment remains unacknowledged without repeating the Acuity side effect", async () => {
  let certificateCalls = 0;
  const ledger = ledgerFunctions.defaultLedger();
  const handler = loadHandlerWithStubs({
    ledger,
    receiptStub: { sendPackageReceiptEmails: async () => { throw new Error("Receipt should not be sent."); } },
    acuityStub: {
      createCertificate: async () => {
        certificateCalls += 1;
        throw new Error("Acuity unavailable");
      },
      extractCertificateCode: () => ""
    }
  });
  const event = {
    id: "evt_failed",
    type: "checkout.session.completed",
    data: { object: {
      id: "cs_test_failed",
      created: Math.floor(Date.now() / 1000),
      payment_status: "paid",
      amount_total: 26400,
      metadata: { email: "student@example.com", productID: "2253280", appointmentTypeID: "95402039" }
    } }
  };
  const deliver = async () => {
    const req = Readable.from([Buffer.from(JSON.stringify(event))]);
    req.method = "POST";
    req.headers = {};
    const res = makeResponse();
    await handler(req, res);
    return res;
  };
  const first = await deliver();
  assert.equal(first.statusCode, 500);
  assert.equal(ledger.stripeEvents[0].status, "failed");
  const retry = await deliver();
  assert.equal(retry.statusCode, 503);
  assert.equal(JSON.parse(retry.body).reconciliationRequired, true);
  assert.equal(certificateCalls, 1);
});

test("stripe webhook creates the appointment and sends the booking confirmation for direct bookings", async () => {
  const appointmentCalls = [];
  const receiptCalls = [];
  const lessonTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
        created: Math.floor(Date.now() / 1000),
        payment_status: "paid",
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
          datetime: lessonTime,
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
