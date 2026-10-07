const { getStripeClient } = require("../lib/stripe");
const crypto = require("node:crypto");
const { handleOptions, readJson, resolveBaseOrigin, resolvePublicOrigin, sendJson } = require("../lib/http");
const { applyCoupon, couponAppliesToPackage, getCouponByCode } = require("../lib/coupons");
const { resolvePackageLabel } = require("../lib/pricing");
const { readPriceState, resolvePriceFromState, policyVersion } = require("../lib/price-config");
const { buildSessionsLink } = require("../lib/receipt-email");
const { findServiceForSelection, findSubjectBySelection, readBookingConfig } = require("../lib/booking-config");
const { updateLedger, recordPolicySnapshot } = require("../lib/operations-ledger");
const { hasAcuityCredentials, listAvailabilityTimes } = require("../lib/acuity");
const { validityWeeks } = require("../lib/package-expiry");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(body, field) {
  const value = cleanString(body[field]);
  if (!value) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function cents(amount) {
  return Math.round(Number(amount) * 100);
}

function resolveMetadata(body) {
  return {
    subjectId: cleanString(body.subjectId),
    subject: cleanString(body.subject),
    format: cleanString(body.format),
    tier: cleanString(body.tier),
    appointmentTypeID: cleanString(body.appointmentTypeID),
    productID: cleanString(body.productID),
    email: cleanString(body.email),
    backUrl: cleanString(body.backUrl),
    datetime: cleanString(body.datetime),
    calendarID: cleanString(body.calendarID),
    firstName: cleanString(body.firstName),
    lastName: cleanString(body.lastName),
    phone: cleanString(body.phone),
    studentName: cleanString(body.studentName),
    studentName2: cleanString(body.studentName2),
    studentFieldID: cleanString(body.studentFieldID),
    notes: cleanString(body.notes),
    timezone: cleanString(body.timezone),
    couponCode: cleanString(body.couponCode),
    source: cleanString(body.source) || "custom-flow"
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const subject = requiredString(body, "subject");
    const format = requiredString(body, "format");
    const tier = requiredString(body, "tier");
    const appointmentTypeID = requiredString(body, "appointmentTypeID");
    const metadata = resolveMetadata(body);
    if (metadata.datetime) {
      const scheduledAt = new Date(metadata.datetime);
      const weeks = validityWeeks(tier);
      if (!weeks || Number.isNaN(scheduledAt.getTime())) {
        return sendJson(req, res, 400, { ok: false, error: "Choose a valid lesson time before continuing to payment." });
      }
      const expiresAt = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
      if (!Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > expiresAt) {
        return sendJson(req, res, 400, { ok: false, error: `This lesson must be scheduled within ${weeks} weeks of purchase.` });
      }
    }
    const bookingConfig = await readBookingConfig();
    const selectedSubject = findSubjectBySelection(bookingConfig, metadata.subjectId || subject);
    if (!selectedSubject) {
      return sendJson(req, res, 400, { ok: false, error: "Choose an active subject before continuing to payment." });
    }
    const service = findServiceForSelection(bookingConfig, { subject: selectedSubject.id, format, tier });
    if (!service || String(service.appointmentTypeID) !== appointmentTypeID || String(service.productID || "") !== String(metadata.productID || "")) {
      return sendJson(req, res, 400, { ok: false, error: "This lesson option has changed. Return to the booking page and select it again." });
    }
    metadata.subjectId = selectedSubject.id;
    metadata.subject = selectedSubject.name;
    metadata.calendarID = cleanString(service.calendarID) || metadata.calendarID;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.email)) {
      return sendJson(req, res, 400, { ok: false, error: "Enter a valid email address so we can issue your package and send your booking details." });
    }
    if (!hasAcuityCredentials()) {
      return sendJson(req, res, 503, { ok: false, error: "Online booking is temporarily unavailable. Please contact Finbar before paying." });
    }

    if (!metadata.productID) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.email) || !metadata.firstName || !metadata.lastName || !metadata.phone || !metadata.datetime) {
        return sendJson(req, res, 400, { ok: false, error: "A valid email, contact name, phone number, and lesson time are required before payment." });
      }
      const scheduledAt = new Date(metadata.datetime);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return sendJson(req, res, 400, { ok: false, error: "Choose a valid lesson time in the future before payment." });
      }
      if (format === "oneToTwo" && !metadata.studentName2) {
        return sendJson(req, res, 400, { ok: false, error: "Add the second student's name before payment for a two-student lesson." });
      }
      const availableTimes = await listAvailabilityTimes({
        appointmentTypeID: Number(appointmentTypeID),
        calendarID: metadata.calendarID ? Number(metadata.calendarID) : undefined,
        date: metadata.datetime.slice(0, 10)
      });
      const selectedTimestamp = scheduledAt.getTime();
      const slotIsAvailable = (Array.isArray(availableTimes) ? availableTimes : []).some((slot) => {
        const slotTime = slot?.datetime || slot?.time || slot;
        return Number.isFinite(new Date(slotTime).getTime()) && new Date(slotTime).getTime() === selectedTimestamp;
      });
      if (!slotIsAvailable) {
        return sendJson(req, res, 409, { ok: false, error: "That lesson time is no longer available. Return to the calendar and choose another time." });
      }
      const weeks = validityWeeks(tier);
      const validityEndsAt = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
      if (scheduledAt.getTime() > validityEndsAt) {
        return sendJson(req, res, 400, { ok: false, error: `This lesson must be scheduled within ${weeks} weeks of purchase.` });
      }
    }

    const priceState = await readPriceState();
    const basePrice = resolvePriceFromState(priceState, selectedSubject.id, format, tier);
    if (basePrice === null) {
      return sendJson(req, res, 400, { ok: false, error: "Unknown package format or tier." });
    }

    const policyText = cleanString(priceState.popup.policyText);
    const currentPolicyVersion = policyVersion(policyText);
    if (policyText && (body.policyAccepted !== true || cleanString(body.policyVersion) !== currentPolicyVersion)) {
      return sendJson(req, res, 400, { ok: false, error: "Review and accept the current lesson policy before paying." });
    }
    const policySnapshotId = policyText ? `policy-${crypto.randomUUID()}` : "";
    const policyAcceptedAt = policyText ? new Date().toISOString() : "";

    const coupon = metadata.couponCode ? await getCouponByCode(metadata.couponCode) : null;
    if (metadata.couponCode && (!coupon || !couponAppliesToPackage(coupon, format, tier))) {
      return sendJson(req, res, 400, { ok: false, error: "That coupon does not apply to this package." });
    }

    const applied = applyCoupon(basePrice, coupon);
    const totalPrice = applied.totalPrice;
    if (typeof body.quotedTotalCents !== "number" || !Number.isSafeInteger(body.quotedTotalCents) || body.quotedTotalCents < 0 || body.quotedTotalCents > 10000000) {
      return sendJson(req, res, 400, { ok: false, error: "Refresh the lesson quote before opening payment." });
    }
    if (body.quotedTotalCents !== cents(totalPrice)) {
      return sendJson(req, res, 409, {
        ok: false,
        code: "PRICE_CHANGED",
        error: "The lesson price changed. Review the updated total before paying.",
        totalPrice
      });
    }
    if (policyText) {
      await updateLedger((ledger) => recordPolicySnapshot(ledger, {
        id: policySnapshotId,
        policyVersion: currentPolicyVersion,
        policyText,
        acceptedAt: policyAcceptedAt,
        status: "pending"
      }));
    }
    const stripe = getStripeClient();
    const origin = resolvePublicOrigin(resolveBaseOrigin(req));
    const successUrl = new URL("/return.html", origin);

    successUrl.searchParams.set("subject", selectedSubject.name);
    successUrl.searchParams.set("subjectId", selectedSubject.id);
    successUrl.searchParams.set("format", format);
    successUrl.searchParams.set("tier", tier);
    successUrl.searchParams.set("appointmentTypeID", appointmentTypeID);
    if (metadata.email) successUrl.searchParams.set("email", metadata.email);
    if (metadata.backUrl) successUrl.searchParams.set("backUrl", metadata.backUrl);
    if (metadata.productID) successUrl.searchParams.set("productID", metadata.productID);
    if (metadata.datetime) successUrl.searchParams.set("datetime", metadata.datetime);
    if (metadata.couponCode) successUrl.searchParams.set("couponCode", metadata.couponCode);
    if (metadata.productID) successUrl.searchParams.set("step", "2");
    successUrl.searchParams.set("source", "stripe");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    if (metadata.studentName2) successUrl.searchParams.set("studentName2", metadata.studentName2);
    successUrl.searchParams.set("bookingLink", buildSessionsLink({
      subject: selectedSubject.name,
      subjectId: selectedSubject.id,
      format,
      tier,
      appointmentTypeID,
      email: metadata.email,
      productID: metadata.productID,
      backUrl: metadata.backUrl,
      couponCode: metadata.couponCode,
      source: "receipt",
      step: "2"
    }, origin));

    const cancelUrl = new URL("/checkout.html", origin);
    Object.entries({
      subject: selectedSubject.name,
      subjectId: selectedSubject.id,
      format,
      tier,
      appointmentTypeID,
      email: metadata.email,
      backUrl: metadata.backUrl,
      productID: metadata.productID,
      datetime: metadata.datetime,
      calendarID: metadata.calendarID,
      firstName: metadata.firstName,
      lastName: metadata.lastName,
      phone: metadata.phone,
      studentName: metadata.studentName,
      studentName2: metadata.studentName2,
      studentFieldID: metadata.studentFieldID,
      notes: metadata.notes,
      timezone: metadata.timezone,
      couponCode: metadata.couponCode,
      source: metadata.source
    }).forEach(([key, value]) => {
      if (value) {
        cancelUrl.searchParams.set(key, value);
      }
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: cents(totalPrice),
            product_data: {
              name: `${selectedSubject.name} - ${resolvePackageLabel(format, tier)}`,
              description: metadata.couponCode
                ? `Coupon ${metadata.couponCode} applied`
                : "Custom package purchase"
            }
          }
        }
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: metadata.email || undefined,
      payment_intent_data: metadata.email
        ? {
            receipt_email: metadata.email
          }
        : undefined,
      metadata: {
        ...metadata,
        ...(policySnapshotId ? { policySnapshotId } : {}),
        ...(policySnapshotId ? { policyVersion: currentPolicyVersion, policyAcceptedAt } : {}),
        basePrice: String(basePrice),
        discountAmount: String(applied.discountAmount),
        totalPrice: String(totalPrice)
      }
    });

    if (policySnapshotId) {
      await updateLedger((ledger) => {
        const current = ledger.policySnapshots.find((item) => item.id === policySnapshotId);
        if (current?.status === "paid") return ledger;
        return recordPolicySnapshot(ledger, {
        id: policySnapshotId,
        policyVersion: currentPolicyVersion,
        policyText,
        acceptedAt: policyAcceptedAt,
        sessionId: session.id,
        status: "attached"
        });
      }).catch((error) => console.error("policy snapshot session link failed", error));
    }

    return sendJson(req, res, 200, {
      ok: true,
      url: session.url,
      sessionId: session.id,
      totalPrice,
      discountAmount: applied.discountAmount,
      couponCode: metadata.couponCode || "",
      packageLabel: resolvePackageLabel(format, tier)
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
