const crypto = require("node:crypto");
const { checkCertificate, createAppointment, listAvailabilityTimes, resolvePackageCertificate } = require("../lib/acuity");
const { handleOptions, readJson, sendJson } = require("../lib/http");
const { resolveBaseOrigin } = require("../lib/http");
const { getStripeClient, isSessionPaid } = require("../lib/stripe");
const { sendBookingConfirmationEmails } = require("../lib/receipt-email");
const { readLedger, updateLedger, upsertPackage, recordAction, recordAppointment, recordReceipt, receiptDeliveryFields } = require("../lib/operations-ledger");
const { readBookingConfig } = require("../lib/booking-config");
const { packageExpiryAt } = require("../lib/package-expiry");

const REQUIRED_STRING_FIELDS = ["datetime", "firstName", "lastName", "email"];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function existingBookingResult(req, res, action) {
  if (["completed", "reconciled", "completed_followup_failed"].includes(action.result) && action.appointmentID) {
    const needsReview = action.result === "completed_followup_failed";
    return sendJson(req, res, 200, {
      ok: true,
      paidByPackage: true,
      alreadyBooked: true,
      appointment: { id: action.appointmentID },
      needsReview,
      warning: needsReview ? "Your lesson is booked, but its balance, email, or dashboard record needs review. Do not submit this time again; contact Finbar." : undefined
    });
  }
  return sendJson(req, res, 409, {
    ok: false,
    needsReview: true,
    error: "This lesson request is already being processed. Do not submit it again; contact Finbar if it does not appear in your bookings."
  });
}

function validateBooking(body) {
  const missing = REQUIRED_STRING_FIELDS.filter((field) => !cleanString(body[field]));
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}.`);
    error.statusCode = 400;
    throw error;
  }

  const appointmentTypeID = Number(body.appointmentTypeID);
  if (!Number.isInteger(appointmentTypeID)) {
    const error = new Error("appointmentTypeID must be an integer.");
    error.statusCode = 400;
    throw error;
  }

  const calendarID = body.calendarID === undefined || body.calendarID === null || body.calendarID === ""
    ? undefined
    : Number(body.calendarID);

  if (calendarID !== undefined && !Number.isInteger(calendarID)) {
    const error = new Error("calendarID must be an integer when provided.");
    error.statusCode = 400;
    throw error;
  }

  return {
    datetime: cleanString(body.datetime),
    appointmentTypeID,
    calendarID,
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    email: cleanString(body.email),
    phone: cleanString(body.phone) || undefined,
    certificate: cleanString(body.certificate) || undefined,
    orderID: cleanString(body.orderID) || undefined,
    productID: cleanString(body.productID) || undefined,
    fields: Array.isArray(body.fields) ? body.fields : undefined,
    notes: cleanString(body.notes) || undefined,
    timezone: cleanString(body.timezone) || undefined,
    notifyCustomer: body.notifyCustomer === true,
    subject: cleanString(body.subject),
    subjectId: cleanString(body.subjectId),
    format: cleanString(body.format),
    tier: cleanString(body.tier),
    backUrl: cleanString(body.backUrl),
    studentName: cleanString(body.studentName),
    studentName2: cleanString(body.studentName2)
  };
}

async function resolvePackagePurchase(linkedPackage, booking, certificate) {
  if (linkedPackage?.purchasedAt && !linkedPackage.linkedManually) return linkedPackage;
  if (!booking.orderID) return linkedPackage || null;

  const session = await getStripeClient().checkout.sessions.retrieve(booking.orderID);
  const metadata = session.metadata || {};
  const paid = isSessionPaid(session);
  if (!paid || cleanString(metadata.certificate) !== certificate ||
    cleanString(metadata.email).toLowerCase() !== booking.email.toLowerCase()) {
    const error = new Error("The purchase details could not be verified. Please contact Finbar before booking with this package.");
    error.statusCode = 403;
    throw error;
  }

  return {
    ...(linkedPackage || {}),
    email: booking.email,
    certificate,
    orderID: booking.orderID,
    productID: linkedPackage?.productID || cleanString(metadata.productID),
    appointmentTypeID: linkedPackage?.appointmentTypeID || cleanString(metadata.appointmentTypeID),
    subject: linkedPackage?.subject || cleanString(metadata.subject),
    subjectId: linkedPackage?.subjectId || cleanString(metadata.subjectId),
    format: linkedPackage?.format || cleanString(metadata.format),
    tier: linkedPackage?.tier || cleanString(metadata.tier),
    purchasedAt: linkedPackage?.purchasedAt || (session.created ? new Date(session.created * 1000).toISOString() : ""),
    linkedManually: false,
    stripePaymentIntentId: linkedPackage?.stripePaymentIntentId || (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id),
    paidAmountMinor: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : linkedPackage?.paidAmountMinor,
    currency: cleanString(session.currency).toUpperCase() || linkedPackage?.currency
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    let booking = validateBooking(await readJson(req));
    const config = await readBookingConfig();
    const configuredService = config.services.find((service) =>
      String(service.appointmentTypeID) === String(booking.appointmentTypeID) && service.active !== false
    );
    if (!configuredService) {
      const error = new Error("This lesson option is not currently available for package bookings. Refresh the booking page and choose an active option.");
      error.statusCode = 400;
      throw error;
    }
    booking = {
      ...booking,
      subject: configuredService.subjectName || booking.subject,
      subjectId: configuredService.subjectId || booking.subjectId,
      format: configuredService.format || booking.format,
      tier: configuredService.tier || booking.tier,
      productID: configuredService.productID || booking.productID,
      calendarID: configuredService.calendarID ? Number(configuredService.calendarID) : undefined
    };
    const resolved = booking.certificate
      ? { certificate: booking.certificate }
      : await resolvePackageCertificate({
        email: booking.email,
        appointmentTypeID: booking.appointmentTypeID,
        orderID: booking.orderID,
        productID: booking.productID
      });
    const certificate = resolved.certificate;

    const ledger = await readLedger();
    const linkedPackage = ledger.packages.find((item) =>
      (certificate && item.certificate === certificate) ||
      (booking.orderID && item.orderID === booking.orderID)
    );
    const packagePurchase = await resolvePackagePurchase(linkedPackage, booking, certificate);
    const expiresAt = packageExpiryAt(packagePurchase);
    const lessonAt = new Date(booking.datetime);
    if (Number.isNaN(lessonAt.getTime()) || lessonAt.getTime() <= Date.now()) {
      const error = new Error("Choose a valid lesson time in the future.");
      error.statusCode = 400;
      throw error;
    }
    if (expiresAt && !Number.isNaN(lessonAt.getTime()) && lessonAt > expiresAt) {
      const error = new Error(`This package expires on ${expiresAt.toISOString().slice(0, 10)}. Choose a lesson time before the expiry date.`);
      error.statusCode = 400;
      throw error;
    }

    const actionId = `package-booking:${crypto.createHash("sha256").update(JSON.stringify([
      certificate, booking.email.toLowerCase(), booking.appointmentTypeID, lessonAt.toISOString()
    ])).digest("hex")}`;
    const previousAction = ledger.actions.find((item) => item.id === actionId);
    if (previousAction && previousAction.result !== "rejected") {
      return existingBookingResult(req, res, previousAction);
    }

    const availableTimes = await listAvailabilityTimes({
      appointmentTypeID: booking.appointmentTypeID,
      calendarID: booking.calendarID,
      date: booking.datetime.slice(0, 10)
    });
    const selectedTimestamp = lessonAt.getTime();
    const slotIsAvailable = (Array.isArray(availableTimes) ? availableTimes : []).some((slot) => {
      const slotTime = slot?.datetime || slot?.time || slot;
      return Number.isFinite(new Date(slotTime).getTime()) && new Date(slotTime).getTime() === selectedTimestamp;
    });
    if (!slotIsAvailable) {
      const error = new Error("That lesson time is no longer available. Refresh the calendar and choose another time.");
      error.statusCode = 409;
      throw error;
    }

    await checkCertificate({
      certificate,
      appointmentTypeID: booking.appointmentTypeID,
      email: booking.email
    });

    let existingAction = null;
    let reserved = false;
    await updateLedger((state) => {
      existingAction = state.actions.find((item) => item.id === actionId) || null;
      reserved = !existingAction || existingAction.result === "rejected";
      if (reserved) recordAction(state, {
        actionId,
        type: "package-booking",
        actor: "Customer",
        result: "started",
        email: booking.email,
        certificate,
        appointmentTypeID: booking.appointmentTypeID,
        datetime: booking.datetime,
        error: ""
      });
      return state;
    });
    if (!reserved) {
      return existingBookingResult(req, res, existingAction);
    }

    let appointment;
    try {
      appointment = await createAppointment({ ...booking, certificate });
    } catch (error) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        try {
          await updateLedger((state) => {
            recordAction(state, { actionId, type: "package-booking", result: "rejected", error: error.message });
            return state;
          });
        } catch (ledgerError) {
          console.error("package booking rejection could not be recorded", ledgerError);
        }
        throw error;
      }
      console.error("package booking outcome needs Acuity reconciliation", error);
      return sendJson(req, res, 409, {
        ok: false,
        needsReview: true,
        error: "We could not confirm whether this lesson was booked. Do not submit this time again; contact Finbar to check it."
      });
    }
    if (!appointment?.id) {
      return sendJson(req, res, 409, {
        ok: false,
        needsReview: true,
        error: "Acuity did not return a booking reference. Do not submit this time again; contact Finbar to check it."
      });
    }

    let needsReview = false;
    let ledgerSaved = false;
    try {
      await updateLedger((state) => {
        if (packagePurchase?.purchasedAt && !packagePurchase.linkedManually) {
          upsertPackage(state, { ...packagePurchase, remaining: undefined });
        }
        recordAppointment(state, {
          id: appointment.id,
          email: booking.email,
          subject: booking.subject,
          subjectId: booking.subjectId,
          datetime: booking.datetime,
          appointmentTypeID: booking.appointmentTypeID,
          certificate,
          orderID: booking.orderID,
          format: booking.format,
          tier: booking.tier,
          purchasedAt: packagePurchase?.purchasedAt || "",
          expiresAt: expiresAt?.toISOString() || "",
          stripePaymentIntentId: packagePurchase?.stripePaymentIntentId || "",
          paidAmountMinor: packagePurchase?.paidAmountMinor,
          currency: packagePurchase?.currency || "EUR",
          status: "Scheduled"
        });
        recordAction(state, { actionId, type: "package-booking", result: "completed", appointmentID: appointment.id });
        return state;
      });
      ledgerSaved = true;
    } catch (ledgerError) {
      needsReview = true;
      console.error("operations ledger update failed after Acuity booking", ledgerError);
    }

    let remaining;
    let receiptEmail = null;
    if (booking.notifyCustomer && booking.subject && booking.format && booking.tier) {
      try {
        const balance = await checkCertificate({
          certificate,
          appointmentTypeID: booking.appointmentTypeID,
          email: booking.email
        });
        remaining = Number(balance?.remainingCounts?.[String(booking.appointmentTypeID)] ?? balance?.remaining);
      } catch (balanceError) {
        needsReview = true;
        console.error("package balance could not be refreshed after booking", balanceError);
      }
      const remainingMessage = Number.isFinite(remaining) && remaining > 0
        ? `Your selected package sessions are confirmed. You have ${remaining} session${remaining === 1 ? "" : "s"} remaining in this package. Use the button below whenever you are ready to book them.`
        : Number.isFinite(remaining)
          ? "All sessions in this package are now confirmed. Your booking details are in this email."
          : "Your selected package session is confirmed. You can check your remaining balance when you return to book again.";

      try {
        receiptEmail = await sendBookingConfirmationEmails({
          customerEmail: booking.email,
          copyEmail: process.env.FINBAR_RECEIPT_COPY_TO,
          origin: resolveBaseOrigin(req),
          subject: booking.subject,
          subjectId: booking.subjectId,
          appointmentID: appointment.id,
          format: booking.format,
          tier: booking.tier,
          appointmentTypeID: booking.appointmentTypeID,
          productID: booking.productID,
          certificate,
          orderID: booking.orderID,
          backUrl: booking.backUrl,
          recipientName: booking.firstName,
          studentName: booking.studentName,
          studentName2: booking.studentName2,
          bookingStep: "2",
          heading: "Your package sessions are confirmed.",
          intro: remainingMessage,
          ctaLabel: remaining > 0 ? "Book remaining sessions" : "View booking options",
          extraNote: remaining > 0 ? "Your saved details will be ready when you return." : "Thank you for booking with Finbar B. Elite Tutoring."
        });
        if (!receiptEmail?.accepted && !receiptEmail?.sent) needsReview = true;
      } catch (emailError) {
        needsReview = true;
        console.error("booking confirmation email failed after Acuity booking", emailError);
      }
      if (receiptEmail) {
        try {
          await updateLedger((state) => {
            recordReceipt(state, { kind: "booking", email: booking.email, orderID: booking.orderID, appointmentID: appointment.id, ...receiptDeliveryFields(receiptEmail) });
            return state;
          });
        } catch (ledgerError) {
          needsReview = true;
          console.error("booking email history could not be recorded", ledgerError);
        }
      }
    }

    if (needsReview && ledgerSaved) {
      try {
        await updateLedger((state) => {
          recordAction(state, {
            actionId,
            type: "package-booking",
            result: "completed_followup_failed",
            appointmentID: appointment.id,
            emailSent: Boolean(receiptEmail?.accepted || receiptEmail?.sent),
            error: "Balance, email, or dashboard follow-up needs review."
          });
          return state;
        });
      } catch (ledgerError) {
        console.error("booking follow-up failure could not be recorded", ledgerError);
      }
    }

    return sendJson(req, res, 201, {
      ok: true,
      paidByPackage: true,
      appointment,
      remaining: Number.isFinite(remaining) ? remaining : undefined,
      receiptEmail,
      needsReview,
      warning: needsReview ? "Your lesson is booked, but its balance, email, or dashboard record needs review. Do not submit this time again; contact Finbar." : undefined
    });
  } catch (error) {
    const acuityError = error.acuity?.error;
    const noCredits = acuityError === "certificate_uses";
    const invalidPackage = [
      "invalid_certificate",
      "expired_certificate",
      "certificate_uses",
      "invalid_certificate_type"
    ].includes(acuityError);

    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      paidByPackage: false,
      canBookWithPackage: false,
      canFallbackToFullPrice: process.env.ALLOW_FULL_PRICE_FALLBACK === "true" && invalidPackage,
      noCredits,
      error: error.message,
      acuity: error.acuity
    });
  }
};
