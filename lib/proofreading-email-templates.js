const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");

const BLOB_PATH = "finbar/proofreading-email-templates.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "proofreading-email-templates.json");
const TEMPLATE_KINDS = ["reviewDocument", "reviewPasted", "accepted", "declined"];

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

function defaultProofreadingTemplates() {
  return {
    version: 1,
    templates: {
      reviewDocument: {
        subject: "New proofreading request from {clientName}",
        heading: "A new document is ready for review.",
        message: "Review the request below, then choose whether to accept it for editing.",
        ctaLabel: "Download document",
        extraNote: "Accepting a request confirms the payment and starts the editing work. Declining it releases the customer's payment hold."
      },
      reviewPasted: {
        subject: "New proofreading request from {clientName}",
        heading: "A new pasted-text request is ready for review.",
        message: "Review the request below, then choose whether to accept it for editing.",
        ctaLabel: "",
        extraNote: "Accepting a request confirms the payment and starts the editing work. Declining it releases the customer's payment hold."
      },
      accepted: {
        subject: "Your proofreading request has been accepted - {serviceLevel}",
        heading: "Your proofreading request has been accepted.",
        message: "Good news, {clientName}. Your submission has been accepted and editing is now underway. Your finished work will be returned by email before {deadline}.",
        ctaLabel: "",
        extraNote: "This confirms that your card has now been charged in full. Keep this email for your records."
      },
      declined: {
        subject: "Update on your proofreading request - {reference}",
        heading: "We're unable to take on your request.",
        message: "After reviewing your submission, we're not able to take on this task. This is usually due to timing or current workload, rather than anything about your document itself.",
        ctaLabel: "",
        extraNote: "Your card was only placed on hold while the submission was reviewed. It has not been charged, and the hold has now been released."
      }
    }
  };
}

function normalizeTemplate(template, fallback) {
  return {
    subject: cleanString(template?.subject) || fallback.subject,
    heading: cleanString(template?.heading) || fallback.heading,
    message: cleanString(template?.message) || fallback.message,
    ctaLabel: typeof template?.ctaLabel === "string" ? cleanString(template.ctaLabel) : fallback.ctaLabel,
    extraNote: cleanString(template?.extraNote) || fallback.extraNote
  };
}

function normalizeProofreadingTemplateState(value) {
  const fallback = defaultProofreadingTemplates();
  return {
    version: 1,
    templates: Object.fromEntries(TEMPLATE_KINDS.map((kind) => [
      kind,
      normalizeTemplate(value?.templates?.[kind], fallback.templates[kind])
    ]))
  };
}

async function readProofreadingTemplateState() {
  try {
    const blob = await get(BLOB_PATH, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      return normalizeProofreadingTemplateState(parseJson(await readTextStream(blob.stream), defaultProofreadingTemplates()));
    }
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Proofreading email template storage is not connected in Vercel. Add Vercel Blob to manage templates.";
      error.statusCode = 503;
      throw error;
    }
  }

  try {
    return normalizeProofreadingTemplateState(parseJson(await fs.readFile(LOCAL_PATH, "utf8"), defaultProofreadingTemplates()));
  } catch {
    return defaultProofreadingTemplates();
  }
}

async function writeProofreadingTemplateState(state) {
  const normalized = normalizeProofreadingTemplateState(state);
  const serialized = JSON.stringify(normalized, null, 2);
  try {
    await put(BLOB_PATH, serialized, { access: "private", contentType: "application/json", allowOverwrite: true });
    return normalized;
  } catch (error) {
    if (isVercelRuntime()) {
      error.message = "Proofreading email template storage is not connected in Vercel. Add Vercel Blob to manage templates.";
      error.statusCode = 503;
      throw error;
    }
  }
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return normalized;
}

function interpolateProofreadingTemplate(value, variables = {}) {
  return String(value || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => cleanString(variables[key]));
}

module.exports = {
  BLOB_PATH,
  TEMPLATE_KINDS,
  defaultProofreadingTemplates,
  interpolateProofreadingTemplate,
  normalizeProofreadingTemplateState,
  readProofreadingTemplateState,
  writeProofreadingTemplateState
};
