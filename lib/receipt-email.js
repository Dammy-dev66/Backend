const { resolvePublicOrigin } = require("./http");
const { profileToken } = require("./package-profile");
const { defaultTemplates, interpolateTemplate, readTemplateState } = require("./email-templates");
const { buildAppointmentManagementUrl } = require("./appointment-access");
const { isProductionRuntime } = require("./runtime-scope");
const { MEETING_PLATFORM } = require("./meeting-platform");

const DEFAULT_MAKE_RECEIPT_WEBHOOK_URL = "https://hook.eu1.make.com/er8khojd5b8ctfxezo79282sqykj9iqh";
const EMAIL_LOGO_URL = "https://backend-ymlj.vercel.app/assets/finbar-horizontal-logo-aligned.png";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value) {
  const email = cleanString(value);
  return email.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email);
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
  if (amount === null || amount === undefined || String(amount).trim() === "") return "";
  const value = Number(amount);
  return Number.isFinite(value) ? `EUR ${value.toFixed(2)}` : "";
}

function buildBookingLink({
  subject,
  subjectId,
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
    ["subjectId", subjectId],
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
  hidePurchaseDetails = false,
  hidePackageCode = false,
  finCopy = false,
  intro,
  ctaLabel,
  detailLabel,
  extraNote,
  manageLink,
  meetingPlatform
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
  const code = !hidePackageCode && certificate ? `<div style="border:1px solid #d8d1c4;background:#f7f3ed;padding:14px 16px;margin:0 0 18px;"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#0a3d91;text-transform:uppercase;margin-bottom:6px;">Package code</div><div style="font-size:18px;font-weight:700;letter-spacing:.08em;color:#111827;">${escapeHtml(certificate)}</div><div style="font-size:12px;line-height:1.5;color:#56616d;margin-top:6px;">Keep this code. You can use it to book your remaining sessions.</div></div>` : "";
  const meeting = meetingPlatform ? `<div style="border:1px solid #cbd8e7;background:#f4f7fb;padding:16px 18px;margin:0 0 18px;"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#0a3d91;text-transform:uppercase;margin-bottom:7px;">Online classroom</div><div style="font-size:14px;font-weight:700;margin-bottom:5px;">${escapeHtml(meetingPlatform.name)}</div><p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#56616d;">Join your lesson using the link below.</p><a href="${escapeHtml(meetingPlatform.joinUrl)}" style="color:#0a3d91;font-weight:700;">Join the VOOV meeting</a><div style="margin-top:10px;font-size:13px;line-height:1.5;color:#56616d;">Tencent Meeting ID: <strong style="color:#111827;">${escapeHtml(meetingPlatform.meetingId)}</strong></div></div>` : "";

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#fbfaf7;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="border:1px solid #d8d1c4;background:#fffdf8;padding:28px;">
          <img src="${EMAIL_LOGO_URL}" alt="Finbar B. Elite Tutoring" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;margin:0 0 20px;">
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;">${escapeHtml(heading || "Payment complete")}</h1>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#56616d;">${roleLine}</p>
          ${hidePurchaseDetails ? "" : `<div style="border:1px solid #d8d1c4;background:#fff;padding:16px 18px;margin:0 0 18px;">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${title}</div>
            <div style="font-size:13px;line-height:1.6;color:#56616d;">${formatLabel}${formatLabel && tierLabel ? " - " : ""}${tierLabel}</div>
            ${price ? `<div style="font-size:13px;line-height:1.6;color:#56616d;">Total: ${price}</div>` : ""}
          </div>`}
          ${code}
          ${meeting}
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${note || ""}</p>
          ${detailLabel ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#56616d;">${escapeHtml(detailLabel)}</p>` : ""}
          <p style="margin:0 0 22px;">
            <a href="${escapeHtml(bookingLink)}" style="display:inline-block;background:#111827;color:#fffdf8;text-decoration:none;padding:13px 18px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">${buttonLabel}</a>
          </p>
          ${manageLink ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#56616d;">To change this lesson, <a href="${escapeHtml(manageLink)}" style="color:#0a3d91;font-weight:700;">manage your booking</a>.</p>` : ""}
        </div>
      </div>
    </body>
  </html>`;
}

function buildEmailText({ heading, subject, format, tier, totalPrice, certificate, bookingLink, intro, ctaLabel, hidePurchaseDetails = false, hidePackageCode = false, manageLink, meetingPlatform }) {
  const price = formatMoney(totalPrice);
  return [
    `Finbar B. Elite Tutoring`,
    `${heading || "Payment complete"} for ${subject || "your booking"}`,
    hidePurchaseDetails ? "" : `${format || ""}${format && tier ? " - " : ""}${tier || ""}`.trim(),
    hidePurchaseDetails || !price ? "" : `Total: ${price}`,
    !hidePackageCode && certificate ? `Package code: ${certificate}` : "",
    ``,
    intro || `Use the link below to continue.`,
    ``,
    `${ctaLabel || "Go to sessions"}: ${bookingLink}`,
    manageLink ? `Manage this lesson: ${manageLink}` : "",
    meetingPlatform ? `Online classroom: ${meetingPlatform.name}\nJoin the VOOV meeting: ${meetingPlatform.joinUrl}\nTencent Meeting ID: ${meetingPlatform.meetingId}` : ""
  ].join("\n");
}

function buildFinHtml({
  heading,
  subject,
  format,
  tier,
  totalPrice,
  certificate,
  bookingLink,
  customerEmail,
  recipientName,
  studentName,
  studentName2,
  meetingPlatform
}) {
  const price = formatMoney(totalPrice);
  const rows = [
    ["Parent / guardian", recipientName],
    ["Customer email", customerEmail],
    ["Student 1", studentName],
    ["Student 2", studentName2],
    ["Package code", certificate]
  ].filter(([, value]) => cleanString(value));
  const details = rows.map(([label, value]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#56616d;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td></tr>`
  ).join("");

  const meeting = meetingPlatform ? `<div style="border:1px solid #cbd8e7;background:#f4f7fb;padding:14px 16px;margin:0 0 18px;"><strong>Online classroom: ${escapeHtml(meetingPlatform.name)}</strong><br><a href="${escapeHtml(meetingPlatform.joinUrl)}" style="color:#0a3d91;">Join the VOOV meeting</a><br>Tencent Meeting ID: ${escapeHtml(meetingPlatform.meetingId)}</div>` : "";
  return `<!doctype html><html><body style="margin:0;background:#fbfaf7;font-family:Arial,sans-serif;color:#111827;"><div style="max-width:640px;margin:0 auto;padding:32px 20px;"><div style="border:1px solid #d8d1c4;background:#fffdf8;padding:28px;"><img src="${EMAIL_LOGO_URL}" alt="Finbar B. Elite Tutoring" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;margin:0 0 20px;"><h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;">${escapeHtml(heading || "Booking notification")}</h1><p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#56616d;">A customer booking update has been received.</p><div style="border:1px solid #d8d1c4;background:#fff;padding:16px 18px;margin:0 0 18px;"><div style="font-size:15px;font-weight:700;margin-bottom:6px;">${escapeHtml(subject || "Booking")}</div><div style="font-size:13px;line-height:1.6;color:#56616d;">${escapeHtml(format || "")}${format && tier ? " - " : ""}${escapeHtml(tier || "")}</div>${price ? `<div style="font-size:13px;line-height:1.6;color:#56616d;">Total: ${escapeHtml(price)}</div>` : ""}</div>${meeting}<table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.45;margin:0 0 18px;">${details}</table><p style="margin:0;"><a href="${escapeHtml(bookingLink)}" style="color:#0a3d91;">Open the customer booking flow</a></p></div></div></body></html>`;
}

function buildEmailPayload({
  kind,
  customerEmail,
  copyEmail,
  origin,
  subject,
  subjectId,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  ctaUrl,
  suppressCopy = false,
  totalPrice,
  recipientName,
  studentName,
  studentName2,
  bookingStep,
  heading,
  intro,
  ctaLabel,
  detailLabel,
  extraNote,
  emailSubject,
  appointmentID
}) {
  const bookingLink = cleanString(ctaUrl) || buildBookingLink({
    subject,
    subjectId,
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
  const manageLink = appointmentID && !["canceled", "recording"].includes(kind)
    ? buildAppointmentManagementUrl(appointmentID, customerEmail, origin)
    : "";
  const meetingPlatform = ["booking", "rescheduled"].includes(kind) ? MEETING_PLATFORM : null;

  return {
    customerEmail,
    copyEmail: suppressCopy ? "" : cleanString(copyEmail) || "hello@finbarb.com",
    senderName: "Finbar B. Elite Tutoring",
    replyTo: "hello@finbarb.com",
    studentName: cleanString(studentName),
    studentName2: cleanString(studentName2),
    subject: cleanString(emailSubject) || (kind === "booking" ? buildBookingSubject(subject) : buildReceiptSubject(subject)),
    html: buildEmailHtml({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package receipt"),
      recipientName,
      subject,
      format,
      tier,
      totalPrice,
      certificate,
      bookingLink,
      hidePurchaseDetails: kind === "recording",
      hidePackageCode: kind === "recording",
      finCopy: false,
      intro: intro || (kind === "booking" ? "Your booking has been confirmed." : "Thanks for your package purchase."),
      ctaLabel: ctaLabel || (kind === "booking" ? "Book again" : "Go to sessions"),
      detailLabel,
      extraNote,
      manageLink,
      meetingPlatform
    }),
    text: buildEmailText({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package receipt"),
      subject,
      format,
      tier,
      totalPrice,
      certificate,
      bookingLink,
      ctaLabel,
      hidePurchaseDetails: kind === "recording",
      hidePackageCode: kind === "recording",
      intro: intro || (kind === "booking" ? "Your booking has been confirmed." : "Thanks for your package purchase."),
      manageLink,
      meetingPlatform
    }),
    finHtml: buildFinHtml({
      heading: heading || (kind === "booking" ? "Booking confirmed" : "Package purchase"),
      subject,
      format,
      tier,
      totalPrice,
      certificate,
      bookingLink,
      customerEmail,
      recipientName,
      studentName,
      studentName2,
      meetingPlatform
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
  subjectId,
  appointmentID,
  format,
  tier,
  appointmentTypeID,
  productID,
  certificate,
  orderID,
  backUrl,
  couponCode,
  ctaUrl,
  suppressCopy = false,
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
    subjectId,
    appointmentID,
    format,
    tier,
    appointmentTypeID,
    productID,
    certificate,
    orderID,
    backUrl,
    couponCode,
    ctaUrl,
    suppressCopy,
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
  subjectId,
  appointmentID,
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
    subjectId,
    appointmentID,
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
  ctaUrl,
  suppressCopy = false,
  totalPrice,
  recipientName,
  studentName,
  studentName2,
  bookingStep,
  heading,
  intro,
  ctaLabel,
  extraNote,
  detailLabel,
  emailSubject,
  actionNote,
  bookingDate,
  templateKind,
  appointmentID
}) {
  const isolatedEnvironment = !isProductionRuntime();
  const targetWebhookUrl = isolatedEnvironment
    ? cleanString(process.env.PREVIEW_MAKE_RECEIPT_WEBHOOK_URL)
    : cleanString(process.env.MAKE_RECEIPT_WEBHOOK_URL) || DEFAULT_MAKE_RECEIPT_WEBHOOK_URL;
  const previewRecipient = cleanString(process.env.PREVIEW_EMAIL_RECIPIENT);
  if (isolatedEnvironment && (!targetWebhookUrl || !previewRecipient)) {
    return {
      sent: false,
      skipped: true,
      deliveryStatus: "unknown",
      provider: null,
      kind: templateKind || kind || "booking",
      reason: "Email is disabled in Preview/Development. Configure an isolated preview webhook and test-recipient address to send test emails."
    };
  }
  const resolvedEmail = isolatedEnvironment ? previewRecipient : cleanString(customerEmail);
  if (!isValidEmail(resolvedEmail)) {
    return {
      sent: false,
      accepted: false,
      skipped: false,
      deliveryStatus: "failed",
      provider: targetWebhookUrl ? "make" : null,
      kind: templateKind || kind || "booking",
      failures: ["A valid recipient email address is required."]
    };
  }
  const resolvedKind = templateKind || kind || "booking";
  const defaults = defaultTemplates().templates[resolvedKind] || defaultTemplates().templates.booking;
  let saved = defaults;
  try {
    const state = await readTemplateState();
    saved = state.templates[resolvedKind] || defaults;
  } catch {
    // Payment emails must still send when the template editor has not been connected yet.
  }
  const variables = {
    recipientName,
    subject,
    bookingDate,
    packageCode: certificate,
    actionNote,
    remaining: ""
  };
  const template = {
    subject: interpolateTemplate(saved.subject, variables),
    heading: interpolateTemplate(saved.heading, variables),
    message: interpolateTemplate(saved.message, variables),
    ctaLabel: interpolateTemplate(saved.ctaLabel, variables),
    extraNote: interpolateTemplate(saved.extraNote, variables)
  };
  const payload = buildEmailPayload({
    kind,
    customerEmail: resolvedEmail,
    copyEmail: isolatedEnvironment ? "" : copyEmail,
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
    ctaUrl,
    suppressCopy: suppressCopy || isolatedEnvironment,
    totalPrice,
    recipientName,
    studentName,
    studentName2,
    appointmentID,
    bookingStep,
    heading: template.heading || heading,
    intro: template.message || intro,
    ctaLabel: template.ctaLabel || ctaLabel,
    detailLabel,
    extraNote: template.extraNote || extraNote,
    emailSubject: template.subject || emailSubject
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
        fromName: payload.senderName,
        kind
      })
    });

    const responseText = await response.text().catch(() => "");
    if (!response.ok) {
      return {
        sent: false,
        accepted: false,
        skipped: false,
        deliveryStatus: "failed",
        provider: "make",
        kind,
        bookingLink: payload.bookingLink,
        customerEmail: payload.customerEmail,
        copyEmail: payload.copyEmail,
        failures: [responseText || `Make webhook returned ${response.status}`]
      };
    }

    return {
      sent: false,
      accepted: true,
      deliveryStatus: "accepted",
      provider: "make",
      kind,
      customerEmail: payload.customerEmail,
      copyEmail: payload.copyEmail,
      bookingLink: payload.bookingLink,
      response: responseText || "ok"
    };
  }

  return {
    sent: false,
    accepted: false,
    skipped: true,
    deliveryStatus: "unknown",
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
