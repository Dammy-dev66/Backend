const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");

const BLOB_PATH = "finbar/email-templates.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "email-templates.json");
const TEMPLATE_KINDS = ["package", "booking", "rescheduled", "canceled"];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

function parseJson(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function readTextStream(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function defaultTemplates() {
  return {
    version: 1,
    templates: {
      package: {
        subject: "Finbar B. Elite Tutoring | Your {subject} package receipt",
        heading: "Your package is confirmed.",
        message: "Thank you for your purchase. Your package code is below. Keep this email so you can return whenever you are ready to book your remaining sessions.",
        ctaLabel: "Book package sessions",
        extraNote: "The button remembers the details from this purchase. You can review or change them before confirming your sessions."
      },
      booking: {
        subject: "Finbar B. Elite Tutoring | Booking confirmed for {subject}",
        heading: "Your lesson is confirmed.",
        message: "Thank you. Your lesson time is confirmed and the booking details have been sent to your email address.",
        ctaLabel: "Book again",
        extraNote: "Use the button below whenever you are ready to make another booking."
      },
      rescheduled: {
        subject: "Finbar B. Elite Tutoring | Your {subject} lesson has been rescheduled",
        heading: "Your lesson has been rescheduled.",
        message: "Your lesson has been moved to {bookingDate}. Please keep this email for your updated booking details.",
        ctaLabel: "View booking options",
        extraNote: "{actionNote}"
      },
      canceled: {
        subject: "Finbar B. Elite Tutoring | Your {subject} lesson has been canceled",
        heading: "Your lesson has been canceled.",
        message: "Your scheduled lesson on {bookingDate} has been canceled.",
        ctaLabel: "Book another lesson",
        extraNote: "{actionNote}"
      }
    }
  };
}

function normalizeTemplate(template, fallback) {
  return {
    subject: cleanString(template?.subject) || fallback.subject,
    heading: cleanString(template?.heading) || fallback.heading,
    message: cleanString(template?.message) || fallback.message,
    ctaLabel: cleanString(template?.ctaLabel) || fallback.ctaLabel,
    extraNote: cleanString(template?.extraNote) || fallback.extraNote
  };
}

function normalizeTemplateState(value) {
  const fallback = defaultTemplates();
  const templates = Object.fromEntries(TEMPLATE_KINDS.map((kind) => [
    kind,
    normalizeTemplate(value?.templates?.[kind], fallback.templates[kind])
  ]));
  return { version: 1, templates };
}

async function readTemplateState() {
  try {
    const blob = await get(BLOB_PATH, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      return normalizeTemplateState(parseJson(await readTextStream(blob.stream), defaultTemplates()));
    }
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Email template storage is not connected in Vercel. Add Vercel Blob to manage templates.";
      error.statusCode = 503;
      throw error;
    }
  }

  try {
    return normalizeTemplateState(parseJson(await fs.readFile(LOCAL_PATH, "utf8"), defaultTemplates()));
  } catch {
    return defaultTemplates();
  }
}

async function writeTemplateState(state) {
  const normalized = normalizeTemplateState(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    await put(BLOB_PATH, serialized, { access: "private", contentType: "application/json", allowOverwrite: true });
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Email template storage is not connected in Vercel. Add Vercel Blob to manage templates.";
      error.statusCode = 503;
      throw error;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

function interpolateTemplate(value, variables = {}) {
  return String(value || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => cleanString(variables[key]));
}

module.exports = {
  BLOB_PATH,
  TEMPLATE_KINDS,
  defaultTemplates,
  interpolateTemplate,
  normalizeTemplateState,
  readTemplateState,
  writeTemplateState
};
