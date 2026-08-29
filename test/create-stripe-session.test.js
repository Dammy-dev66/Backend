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
  const stripePath = require.resolve("../lib/stripe");
  const handlerPath = require.resolve("../api/create-stripe-session");
  delete require.cache[stripePath];
  delete require.cache[handlerPath];
  require.cache[stripePath] = { exports: stub };
  return require("../api/create-stripe-session");
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
    email: "student@example.com",
    backUrl: "https://carrd.example"
  }))]);
  req.method = "POST";
  req.headers = { origin: "https://backend-ymlj.vercel.app" };

  const res = makeResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);

  const successUrl = new URL(calls[0].success_url);
  assert.equal(successUrl.searchParams.get("subject"), "English Literature");
  assert.equal(successUrl.searchParams.get("tier"), "pack6");
  assert.equal(successUrl.searchParams.get("step"), "2");
  assert.equal(successUrl.searchParams.get("source"), "stripe");
  assert.equal(successUrl.searchParams.get("bookingLink"), "https://backend-ymlj.vercel.app/?subject=English+Literature&format=oneToTwo&tier=pack6&appointmentTypeID=96938926&email=student%40example.com&productID=2260532&backUrl=https%3A%2F%2Fcarrd.example&step=2&source=receipt");
});
