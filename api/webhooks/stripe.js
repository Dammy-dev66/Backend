const { createAppointment, createCertificate, extractCertificateCode } = require("../../lib/acuity");
const { handleOptions, resolveBaseOrigin, sendJson } = require("../../lib/http");
const { assertStripeEventMode, isSessionPaid } = require("../../lib/stripe");
const {
  sendPackageReceiptEmails,
  sendBookingConfirmationEmails
} = require("../../lib/receipt-email");
const { updateLedger, upsertPackage, recordAppointment, recordReceipt, receiptDeliveryFields, recordStripeEvent, recordPolicySnapshot } = require("../../lib/operations-ledger");
const { hasAcuityCredentials } = require("../../lib/acuity");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function combineNotes(notes, studentName2) {
  return [
    cleanString(notes),
    cleanString(studentName2) ? `Student 2: ${cleanString(studentName2)}` : ""
  ].filter(Boolean).join("\n");
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  let claimedEventId = "";
  try {
    const rawBody = await readRawBody(req);
    let event = null;
    let stripeClient = null;
    const stripeSignature = req.headers["stripe-signature"] || req.headers["Stripe-Signature"];
    const secret = cleanString(process.env.STRIPE_WEBHOOK_SECRET);

    if (secret) {
      stripeClient = require("../../lib/stripe").getStripeClient();
      if (!stripeSignature) {
        return sendJson(req, res, 400, { ok: false, error: "Missing Stripe signature." });
      }

      event = stripeClient.webhooks.constructEvent(rawBody, stripeSignature, secret);
    } else {
      if (cleanString(process.env.VERCEL) === "1" || cleanString(process.env.VERCEL_ENV)) {
        return sendJson(req, res, 503, { ok: false, error: "Stripe webhook signature verification is not configured." });
      }
      event = JSON.parse(rawBody || "{}");
    }

    assertStripeEventMode(event);

    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      return sendJson(req, res, 200, { ok: true, ignored: true, type: event.type || "" });
    }

    const session = event.data?.object || {};
    if (!isSessionPaid(session)) {
      return sendJson(req, res, 200, { ok: true, pendingPayment: true, ignored: true, type: event.type || "" });
    }
    const metadata = session.metadata || {};
    const acuityReady = hasAcuityCredentials();
    if (!acuityReady) {
      return sendJson(req, res, 503, { ok: false, error: "Stripe fulfillment requires Acuity credentials for this deployment environment." });
    }
    const email = cleanString(metadata.email || session.customer_details?.email || session.customer_email);
    const productID = cleanString(metadata.productID);
    const subject = cleanString(metadata.subject);
    const subjectId = cleanString(metadata.subjectId);
    const format = cleanString(metadata.format);
    const tier = cleanString(metadata.tier);
    const appointmentTypeID = cleanString(metadata.appointmentTypeID);
    const firstName = cleanString(metadata.firstName || session.customer_details?.name || email);
    const lastName = cleanString(metadata.lastName);
    const phone = cleanString(metadata.phone);
    const notes = cleanString(metadata.notes);
    const timezone = cleanString(metadata.timezone);
    const studentName = cleanString(metadata.studentName);
    const studentName2 = cleanString(metadata.studentName2);
    const studentFieldID = cleanString(metadata.studentFieldID);
    const datetime = cleanString(metadata.datetime);
    const calendarID = cleanString(metadata.calendarID);
    const couponCode = cleanString(metadata.couponCode);
    const backUrl = cleanString(metadata.backUrl);
    const orderID = cleanString(metadata.orderID || session.id);
    const totalPrice = cleanString(metadata.totalPrice || session.amount_total / 100);
    let certificateCode = cleanString(metadata.certificate);
    let receiptEmail = null;
    let certificateCreated = false;
    let appointmentCreated = false;
    let createdAppointment = null;

    if (!email) {
      return sendJson(req, res, 200, {
        ok: true,
        ignored: true,
        reason: "Missing email metadata on completed checkout session."
      });
    }

    const sessionId = cleanString(session.id);
    claimedEventId = sessionId ? `checkout-session:${sessionId}` : "";
    if (!claimedEventId) return sendJson(req, res, 400, { ok: false, error: "The Stripe event has no stable identifier." });
    let claimStatus = "claimed";
    await updateLedger((ledger) => {
      const existing = ledger.stripeEvents.find((item) => item.id === claimedEventId);
      if (existing) {
        claimStatus = cleanString(existing.status) || "processing";
        return ledger;
      }
      recordStripeEvent(ledger, {
        id: claimedEventId,
        sessionId,
        stripeEventID: cleanString(event.id),
        stripeEventType: cleanString(event.type),
        orderID: cleanString(metadata.orderID || session.id),
        email,
        status: "processing",
        stage: "started"
      });
      return ledger;
    });
    if (claimStatus !== "claimed") {
      const completed = claimStatus === "completed";
      return sendJson(req, res, completed ? 200 : 503, {
        ok: completed,
        duplicate: true,
        eventStatus: claimStatus,
        reconciliationRequired: !completed,
        ...(!completed ? { error: "Paid checkout fulfillment is pending reconciliation. No additional Acuity action was attempted." } : {})
      });
    }

    if (productID && acuityReady) {
      const certificateResponse = await createCertificate({
        productID,
        email
      });
      certificateCode = certificateCode || extractCertificateCode(certificateResponse);
      certificateCreated = true;

      await updateLedger((ledger) => recordStripeEvent(ledger, {
        id: claimedEventId,
        stripeEventID: cleanString(event.id),
        stripeEventType: cleanString(event.type),
        status: "processing",
        stage: "package_created",
        certificate: certificateCode
      }));

      if (certificateCode && stripeClient && session.id) {
        await stripeClient.checkout.sessions.update(session.id, {
          metadata: { ...metadata, certificate: certificateCode }
        });
      }
    }

    if (!productID && datetime && firstName && lastName && acuityReady) {
      const fields = [];
      if (studentName && studentFieldID) {
        const parsedFieldID = Number(studentFieldID);
        if (Number.isInteger(parsedFieldID)) {
          fields.push({ id: parsedFieldID, value: studentName });
        }
      }

      createdAppointment = await createAppointment({
        datetime,
        appointmentTypeID: Number(appointmentTypeID),
        calendarID: calendarID ? Number(calendarID) : undefined,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        notes: combineNotes(notes, studentName2) || undefined,
        timezone: timezone || undefined,
        fields
      });
      appointmentCreated = true;
      await updateLedger((ledger) => recordStripeEvent(ledger, {
        id: claimedEventId,
        status: "processing",
        stage: "appointment_created",
        appointmentID: cleanString(createdAppointment.id)
      }));
    }

    const sendEmail = productID ? sendPackageReceiptEmails : sendBookingConfirmationEmails;
    receiptEmail = await sendEmail({
      customerEmail: email,
      copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
      origin: resolveBaseOrigin(req),
      subject,
      subjectId,
      appointmentID: createdAppointment?.id,
      format,
      tier,
      appointmentTypeID,
      productID,
      certificate: certificateCode,
      orderID,
      backUrl,
      couponCode,
      totalPrice,
      recipientName: firstName,
      studentName,
      studentName2
    });
    await updateLedger((ledger) => recordStripeEvent(ledger, {
      id: claimedEventId,
      status: "processing",
      stage: receiptEmail?.accepted ? "email_accepted" : receiptEmail?.sent ? "email_sent" : "email_failed",
      emailSent: receiptEmail?.sent === true,
      emailDeliveryStatus: receiptEmail?.deliveryStatus || "unknown"
    }));

    await updateLedger((ledger) => {
      const policySnapshot = ledger.policySnapshots.find((item) => item.id === cleanString(metadata.policySnapshotId));
      const acceptedPolicy = policySnapshot ? {
        policyVersion: policySnapshot.policyVersion,
        policyText: policySnapshot.policyText,
        policyAcceptedAt: policySnapshot.acceptedAt
      } : {
        policyVersion: cleanString(metadata.policyVersion),
        policyText: "",
        policyAcceptedAt: cleanString(metadata.policyAcceptedAt)
      };
      if (productID) {
        upsertPackage(ledger, {
          email,
          certificate: certificateCode,
          orderID,
          productID,
          appointmentTypeID,
          subject,
          subjectId,
          format,
          tier,
          purchasedAt: new Date(session.created * 1000).toISOString(),
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          paidAmountMinor: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : undefined,
          currency: cleanString(session.currency).toUpperCase(),
          ...acceptedPolicy
        });
      }
      if (createdAppointment?.id) {
        const paidAt = new Date(session.created * 1000);
        const expiryDays = tier === "trial" || tier === "single" ? 42 : 0;
        if (expiryDays) paidAt.setUTCDate(paidAt.getUTCDate() + expiryDays);
        recordAppointment(ledger, {
          id: createdAppointment.id,
          email,
          subject,
          subjectId,
          datetime,
          appointmentTypeID,
          certificate: certificateCode,
          format,
          tier,
          orderID,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          paidAmountMinor: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : undefined,
          currency: cleanString(session.currency).toUpperCase(),
          ...acceptedPolicy,
          purchasedAt: new Date(session.created * 1000).toISOString(),
          expiresAt: expiryDays ? paidAt.toISOString() : "",
          status: "Scheduled"
        });
      }
      if (policySnapshot) {
        recordPolicySnapshot(ledger, { ...policySnapshot, status: "paid", sessionId });
      }
      recordReceipt(ledger, { kind: productID ? "package" : "booking", email, orderID, appointmentID: createdAppointment?.id, ...receiptDeliveryFields(receiptEmail) });
      recordStripeEvent(ledger, {
        id: claimedEventId,
        sessionId,
        stripeEventID: cleanString(event.id),
        stripeEventType: cleanString(event.type),
        orderID,
        email,
        status: "completed",
        stage: "complete",
        certificate: certificateCode,
        appointmentID: cleanString(createdAppointment?.id),
        emailSent: receiptEmail?.sent === true,
        emailDeliveryStatus: receiptEmail?.deliveryStatus || "unknown"
      });
      return ledger;
    });
    claimedEventId = "";

    return sendJson(req, res, 200, {
      ok: true,
      handled: true,
      type: event.type,
      kind: productID ? "package" : "booking",
      certificateCreated,
      appointmentCreated,
      receiptEmail
    });
  } catch (error) {
    if (claimedEventId) {
      try {
        await updateLedger((ledger) => recordStripeEvent(ledger, {
          id: claimedEventId,
          status: "failed",
          stage: "reconciliation_required",
          error: cleanString(error.message).slice(0, 500)
        }));
      } catch (ledgerError) {
        console.error("stripe fulfillment failure could not be recorded", ledgerError);
      }
    }
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
