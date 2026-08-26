const { resolvePublicOrigin } = require("./http");

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
  return url.toString();
}

function buildReceiptSubject(subject) {
  const title = cleanString(subject) || "your package";
  return `Finbar B. Elite Tutoring - receipt for ${title}`;
}

function buildBookingSubject(subject) {
  const title = cleanString(subject) || "your booking";
  return `Finbar B. Elite Tutoring - booking confirmed for ${title}`;
}

function buildEmailHtml({
  heading,
  recipientName,
  subject,
  format,
  tier,
  totalPrice,
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
    ? "This is the purchase receipt copy for Fin."
    : intro || "Thanks for your booking.";
  const buttonLabel = escapeHtml(ctaLabel || "Go to sessions");
  const note = extraNote ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#56616d;">${escapeHtml(extraNote)}</p>` : "";

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
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${note || ""}</p>
          ${detailLabel ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${escapeHtml(detailLabel)}</p>` : ""}
          <p style="margin:0 0 22px;">
            <a href="${escapeHtml(bookingLink)}" style="display:inline-block;background:#111827;color:#fffdf8;text-decoration:none;padding:13px 18px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">${buttonLabel}</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#56616d;word-break:break-word;">Booking link: <a href="${escapeHtml(bookingLink)}" style="color:#0a3d91;">${escapeHtml(bookingLink)}</a></p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildEmailText({ heading, subject, format, tier, totalPrice, bookingLink, intro }) {
  return [
    `Finbar B. Elite Tutoring`,
    `${heading || "Payment complete"} for ${subject || "your booking"}`,
    `${format || ""}${format && tier ? " - " : ""}${tier || ""}`.trim(),
    `Total: ${formatMoney(totalPrice)}`,
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
    copyEmail: cleanString(copyEmail),
    subject: kind === "booking" ? buildBookingSubject(subject) : buildReceiptSubject(subject),
    html: buildEmailHtml({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package receipt"),
      recipientName,
      subject,
      format,
      tier,
      totalPrice,
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
      recipientName
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
  recipientName
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
    bookingStep: "2",
    heading: "Package receipt",
    intro: "Thanks for your package purchase.",
    ctaLabel: "Go to sessions",
    extraNote: "Use the button below to go straight to the sessions page when you are ready to choose your remaining time slots."
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
  recipientName
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
    bookingStep: "1",
    heading: "Booking confirmed",
    intro: "Your booking has been confirmed.",
    ctaLabel: "Book again",
    extraNote: "If you want to book another lesson later, use the link below and the custom booking flow will open again."
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
  bookingStep,
  heading,
  intro,
  ctaLabel,
  extraNote
}) {
  const webhookUrl = cleanString(process.env.MAKE_RECEIPT_WEBHOOK_URL);
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
    bookingStep,
    heading,
    intro,
    ctaLabel,
    extraNote
  });

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
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
