const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildReceiptHtml,
  buildReceiptPayload,
  buildReceiptSubject,
  buildSessionsLink,
  sendBookingConfirmationEmails
} = require("../lib/receipt-email");

test("receipt email link returns the student to step 2 with package context", () => {
  const originalSecret = process.env.PACKAGE_PROFILE_SIGNING_SECRET;
  process.env.PACKAGE_PROFILE_SIGNING_SECRET = "test-profile-secret";
  const bookingLink = buildSessionsLink({
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    appointmentTypeID: "95402039",
    email: "student@example.com",
    productID: "2253280",
    certificate: "CERT-123",
    orderID: "ORDER-9",
    backUrl: "https://example.com/carrd",
    couponCode: "FIN10",
    source: "receipt"
  }, "https://backend-ymlj.vercel.app");

  const url = new URL(bookingLink);

  try {
    assert.equal(url.pathname, "/");
    assert.equal(url.searchParams.get("step"), "2");
    assert.equal(url.searchParams.get("certificate"), "CERT-123");
    assert.equal(url.searchParams.get("subject"), "AP Psychology");
    assert.equal(url.searchParams.get("source"), "receipt");
    assert.ok(url.searchParams.get("profile"));
  } finally {
    if (originalSecret === undefined) delete process.env.PACKAGE_PROFILE_SIGNING_SECRET;
    else process.env.PACKAGE_PROFILE_SIGNING_SECRET = originalSecret;
  }
});

test("receipt email content mentions the booking link", () => {
  const bookingLink = "https://backend-ymlj.vercel.app/?step=2";
  const html = buildReceiptHtml({
    recipientName: "Joshua",
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    totalPrice: 264,
    bookingLink
  });

  assert.match(html, /Go to sessions/);
  assert.match(html, /step=2/);
  assert.doesNotMatch(html, /Booking link:/);
  assert.match(buildReceiptSubject("AP Psychology"), /Your AP Psychology package receipt/i);
});

test("receipt payload keeps the customer and copy recipient together", () => {
  const payload = buildReceiptPayload({
    customerEmail: "student@example.com",
    copyEmail: "fin@example.com",
    origin: "https://backend-ymlj.vercel.app",
    subject: "AP Psychology",
    format: "oneToOne",
    tier: "pack6",
    appointmentTypeID: "95402039",
    productID: "2253280",
    certificate: "CERT-123",
    orderID: "ORDER-9",
    backUrl: "https://example.com/carrd",
    couponCode: "FIN10",
    totalPrice: 264,
    recipientName: "Joshua"
  });

  assert.equal(payload.customerEmail, "student@example.com");
  assert.equal(payload.copyEmail, "fin@example.com");
  assert.equal(payload.receipt.certificate, "CERT-123");
  assert.match(payload.html, /Go to sessions/);
  assert.match(payload.html, /Package code/);
  assert.match(payload.html, /CERT-123/);
  assert.match(payload.text, /Go to sessions:/);
  assert.match(payload.text, /Package code: CERT-123/);
});

test("two-student receipt payload includes both student names for Make", () => {
  const payload = buildReceiptPayload({
    customerEmail: "student@example.com",
    subject: "English Literature",
    format: "oneToTwo",
    tier: "single",
    appointmentTypeID: "96938789",
    totalPrice: 70,
    recipientName: "Parent",
    studentName: "Alice Example",
    studentName2: "Ben Example"
  });

  assert.equal(payload.studentName, "Alice Example");
  assert.equal(payload.studentName2, "Ben Example");
  assert.equal(payload.receipt.studentName, "Alice Example");
  assert.equal(payload.receipt.studentName2, "Ben Example");
});

test("receipt payload defaults Fin's copy address when production configuration is empty", () => {
  const payload = buildReceiptPayload({
    customerEmail: "student@example.com",
    copyEmail: "",
    subject: "AP Psychology",
    format: "oneToTwo",
    tier: "pack6"
  });

  assert.equal(payload.copyEmail, "hello@finbarb.com");
});

test("booking confirmation falls back to the Make webhook when the env var is missing", async () => {
  const originalWebhook = process.env.MAKE_RECEIPT_WEBHOOK_URL;
  delete process.env.MAKE_RECEIPT_WEBHOOK_URL;

  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => "ok"
    };
  };

  try {
    const result = await sendBookingConfirmationEmails({
      customerEmail: "student@example.com",
      copyEmail: "fin@example.com",
      origin: "https://backend-ymlj.vercel.app",
      subject: "AP Psychology",
      format: "oneToOne",
      tier: "trial",
      appointmentTypeID: "95402082",
      totalPrice: 50,
      recipientName: "Joshua"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://hook.eu1.make.com/er8khojd5b8ctfxezo79282sqykj9iqh");
    assert.equal(result.sent, true);
    assert.equal(result.provider, "make");
  } finally {
    global.fetch = originalFetch;
    if (originalWebhook === undefined) {
      delete process.env.MAKE_RECEIPT_WEBHOOK_URL;
    } else {
      process.env.MAKE_RECEIPT_WEBHOOK_URL = originalWebhook;
    }
  }
});
