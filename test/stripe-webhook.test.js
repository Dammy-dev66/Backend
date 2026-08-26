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
  assert.equal(calls.length, 1);
  assert.equal(calls[0].customerEmail, "student@example.com");
  assert.equal(calls[0].productID, "2253280");
  assert.equal(calls[0].orderID, "ORDER-9");
  assert.equal(calls[0].recipientName, "Joshua");
});
