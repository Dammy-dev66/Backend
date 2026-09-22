const { resolvePublicOrigin } = require("./http");
const { profileToken } = require("./package-profile");

const DEFAULT_MAKE_RECEIPT_WEBHOOK_URL = "https://hook.eu1.make.com/er8khojd5b8ctfxezo79282sqykj9iqh";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? `EUR ${value.toFixed(2)}` : "";
}

function buildBookingLink({
  subject,
  format,
  tier,
  appointmentTypeID,
  email,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  source,
  step = "2"
}, origin) {
  const url = new URL("/", resolvePublicOrigin(origin || "https://backend-ymlj.vercel.app"));

  [
    ["subject", subject],
    ["format", format],
    ["tier", tier],
    ["appointmentTypeID", appointmentTypeID],
    ["email", email],
    ["productID", productID],
    ["certificate", certificate],
    ["orderID", orderID],
    ["backUrl", backUrl],
    ["couponCode", couponCode]
  ].forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, String(value));
    }
  });

  url.searchParams.set("step", String(step));
  url.searchParams.set("source", source || "receipt");
  const token = profileToken({ orderID, certificate, email });
  if (token) {
    url.searchParams.set("profile", token);
  }
  return url.toString();
}

function buildReceiptSubject(subject) {
  const title = cleanString(subject) || "your package";
  return `Finbar B. Elite Tutoring | Your ${title} package receipt`;
}

function buildBookingSubject(subject) {
  const title = cleanString(subject) || "your booking";
  return `Finbar B. Elite Tutoring | Booking confirmed for ${title}`;
}

function buildEmailHtml({
  heading,
  recipientName,
  subject,
  format,
  tier,
  totalPrice,
  certificate,
  bookingLink,
  finCopy = false,
  intro,
  ctaLabel,
  detailLabel,
  extraNote
}) {
  const title = escapeHtml(subject || "your package");
  const formatLabel = escapeHtml(format || "");
  const tierLabel = escapeHtml(tier || "");
  const name = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi there,";
  const price = escapeHtml(formatMoney(totalPrice));
  const roleLine = finCopy
    ? "This is Finbar's internal booking notification."
    : intro || "Thank you for your booking.";
  const buttonLabel = escapeHtml(ctaLabel || "Go to sessions");
  const note = extraNote ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#56616d;">${escapeHtml(extraNote)}</p>` : "";
  const code = certificate ? `<div style="border:1px solid #d8d1c4;background:#f7f3ed;padding:14px 16px;margin:0 0 18px;"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#0a3d91;text-transform:uppercase;margin-bottom:6px;">Package code</div><div style="font-size:18px;font-weight:700;letter-spacing:.08em;color:#111827;">${escapeHtml(certificate)}</div><div style="font-size:12px;line-height:1.5;color:#56616d;margin-top:6px;">Keep this code. You can use it to book your remaining sessions.</div></div>` : "";

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#fbfaf7;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="border:1px solid #d8d1c4;background:#fffdf8;padding:28px;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:.18em;font-weight:700;color:#0a3d91;text-transform:uppercase;">Finbar B. Elite Tutoring</p>
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;">${escapeHtml(heading || "Payment complete")}</h1>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#56616d;">${roleLine}</p>
          <div style="border:1px solid #d8d1c4;background:#fff;padding:16px 18px;margin:0 0 18px;">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${title}</div>
            <div style="font-size:13px;line-height:1.6;color:#56616d;">${formatLabel}${formatLabel && tierLabel ? " - " : ""}${tierLabel}</div>
            <div style="font-size:13px;line-height:1.6;color:#56616d;">Total: ${price}</div>
          </div>
          ${code}
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${note || ""}</p>
          ${detailLabel ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${escapeHtml(detailLabel)}</p>` : ""}
          <p style="margin:0 0 22px;">
            <a href="${escapeHtml(bookingLink)}" style="display:inline-block;background:#111827;color:#fffdf8;text-decoration:none;padding:13px 18px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">${buttonLabel}</a>
          </p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildEmailText({ heading, subject, format, tier, totalPrice, certificate, bookingLink, intro }) {
  return [
    `Finbar B. Elite Tutoring`,
    `${heading || "Payment complete"} for ${subject || "your booking"}`,
    `${format || ""}${format && tier ? " - " : ""}${tier || ""}`.trim(),
    `Total: ${formatMoney(totalPrice)}`,
    certificate ? `Package code: ${certificate}` : "",
    ``,
    intro || `Use the link below to continue.`,
    ``,
    `Go to sessions: ${bookingLink}`
  ].join("\n");
}

function buildEmailPayload({
  kind,
  customerEmail,
  copyEmail,
  origin,
  subject,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  totalPrice,
  recipientName,
  studentName,
  studentName2,
  bookingStep,
  heading,
  intro,
  ctaLabel,
  detailLabel,
  extraNote
}) {
  const bookingLink = buildBookingLink({
    subject,
    format,
    tier,
    appointmentTypeID,
    email: customerEmail,
    productID,
    certificate,
    orderID,
    backUrl,
    couponCode,
    source: kind || "receipt",
    step: bookingStep || "2"
  }, origin);

  return {
    customerEmail,
    copyEmail: cleanString(copyEmail) || "hello@finbarb.com",
    studentName: cleanString(studentName),
    studentName2: cleanString(studentName2),
    subject: kind === "booking" ? buildBookingSubject(subject) : buildReceiptSubject(subject),
    html: buildEmailHtml({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package receipt"),
      recipientName,
      subject,
      format,
      tier,
      totalPrice,
      certificate,
      bookingLink,
      finCopy: false,
      intro: intro || (kind === "booking" ? "Your booking has been confirmed." : "Thanks for your package purchase."),
      ctaLabel: ctaLabel || (kind === "booking" ? "Book again" : "Go to sessions"),
      detailLabel,
      extraNote
    }),
    text: buildEmailText({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package receipt"),
      subject,
      format,
      tier,
      totalPrice,
      certificate,
      bookingLink,
      intro: intro || (kind === "booking" ? "Your booking has been confirmed." : "Thanks for your package purchase.")
    }),
    bookingLink,
    receipt: {
      kind: kind || "package",
      subject,
      format,
      tier,
      appointmentTypeID,
      productID,
      certificate,
      orderID,
      backUrl,
      couponCode,
      totalPrice,
      certificate,
      recipientName,
      studentName,
      studentName2
    }
  };
}

async function sendPackageReceiptEmails({
  customerEmail,
  copyEmail,
  origin,
  subject,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  totalPrice,
  recipientName,
  studentName,
  studentName2
}) {
  return sendNotificationEmails({
    kind: "package",
    customerEmail,
    copyEmail,
    origin,
    subject,
    format,
    tier,
    appointmentTypeID,
    productID,
    certificate,
    orderID,
    backUrl,
    couponCode,
    totalPrice,
    recipientName,
    studentName,
    studentName2,
    bookingStep: "2",
    heading: "Your package is confirmed.",
    intro: "Thank you for your purchase. Your package code is below. Keep this email so you can return whenever you are ready to book your remaining sessions.",
    ctaLabel: "Book package sessions",
    extraNote: "The button remembers the details from this purchase. You can review or change them before confirming your sessions."
  });
}

async function sendBookingConfirmationEmails({
  customerEmail,
  copyEmail,
  origin,
  subject,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  totalPrice,
  recipientName,
  studentName,
  studentName2,
  heading,
  intro,
  ctaLabel,
  extraNote,
  bookingStep
}) {
  return sendNotificationEmails({
    kind: "booking",
    customerEmail,
    copyEmail,
    origin,
    subject,
    format,
    tier,
    appointmentTypeID,
    productID,
    certificate,
    orderID,
    backUrl,
    couponCode,
    totalPrice,
    recipientName,
    studentName,
    studentName2,
    bookingStep: bookingStep || "1",
    heading: heading || "Your lesson is confirmed.",
    intro: intro || "Thank you. Your lesson time is confirmed and the booking details have been sent to your email address.",
    ctaLabel: ctaLabel || "Book again",
    extraNote: extraNote || "Use the button below whenever you are ready to make another booking."
  });
}

async function sendNotificationEmails({
  kind,
  customerEmail,
  copyEmail,
  origin,
  subject,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  totalPrice,
  recipientName,
  studentName,
  studentName2,
  bookingStep,
  heading,
  intro,
  ctaLabel,
  extraNote
}) {
  const webhookUrl = cleanString(process.env.MAKE_RECEIPT_WEBHOOK_URL);
  const targetWebhookUrl = webhookUrl || DEFAULT_MAKE_RECEIPT_WEBHOOK_URL;
  const payload = buildEmailPayload({
    kind,
    customerEmail,
    copyEmail,
    origin,
    subject,
    format,
    tier,
    appointmentTypeID,
    productID,
    certificate,
    orderID,
    backUrl,
    couponCode,
    totalPrice,
    recipientName,
    studentName,
    studentName2,
    bookingStep,
    heading,
    intro,
    ctaLabel,
    extraNote
  });

  if (targetWebhookUrl) {
    const response = await fetch(targetWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        copyTo: payload.copyEmail,
        to: payload.customerEmail,
        kind
      })
    });

    const responseText = await response.text().catch(() => "");
    if (!response.ok) {
      return {
        sent: false,
        skipped: false,
        provider: "make",
        kind,
        bookingLink: payload.bookingLink,
        customerEmail,
        copyEmail: payload.copyEmail,
        failures: [responseText || `Make webhook returned ${response.status}`]
      };
    }

    return {
      sent: true,
      provider: "make",
      kind,
      customerEmail,
      copyEmail: payload.copyEmail,
      bookingLink: payload.bookingLink,
      response: responseText || "ok"
    };
  }

  return {
    sent: false,
    skipped: true,
    provider: null,
    kind,
    reason: "MAKE_RECEIPT_WEBHOOK_URL is not configured.",
    customerEmail,
    copyEmail: payload.copyEmail,
    bookingLink: payload.bookingLink
  }
}

module.exports = {
  buildEmailText,
  buildReceiptSubject,
  buildBookingSubject,
  buildEmailHtml,
  buildBookingLink,
  buildEmailPayload,
  buildReceiptHtml: buildEmailHtml,
  buildReceiptText: buildEmailText,
  buildSessionsLink: buildBookingLink,
  buildReceiptPayload: (input) => buildEmailPayload({ ...input, kind: "package", bookingStep: "2" }),
  buildBookingConfirmationPayload: (input) => buildEmailPayload({ ...input, kind: "booking", bookingStep: "1" }),
  sendPackageReceiptEmails,
  sendBookingConfirmationEmails,
  sendNotificationEmails
};
