const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { get, put } = require("@vercel/blob");
const { PACKAGE_LABELS, TIER_LABELS } = require("./pricing");

const BLOB_PATH = "finbar/booking-config.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "booking-config.json");
const DEFAULT_CALENDAR_ID = "14289294";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function defaultSubjects() {
  return [
    { id: "ap-psychology", name: "AP Psychology", slug: "ap-psychology", active: true, order: 1 },
    { id: "elegant-essays", name: "Elegant Essays", slug: "elegant-essays", active: true, order: 2 },
    { id: "ap-english-language-composition", name: "AP English Language & Composition", slug: "ap-english-language-composition", active: true, order: 3 },
    { id: "english-literature", name: "English Literature", slug: "english-literature", active: true, order: 4 },
    { id: "essay-writing-college-apps", name: "Essay Writing & College Apps", slug: "essay-writing-college-apps", active: true, order: 5 }
  ];
}

function defaultServices() {
  return [
    { id: "ap-psychology:oneToOne:trial", subjectId: "ap-psychology", format: "oneToOne", tier: "trial", appointmentTypeID: "95402082", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToOne:single", subjectId: "ap-psychology", format: "oneToOne", tier: "single", appointmentTypeID: "95401962", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToOne:pack6", subjectId: "ap-psychology", format: "oneToOne", tier: "pack6", appointmentTypeID: "95402039", productID: "2253280", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToOne:pack12", subjectId: "ap-psychology", format: "oneToOne", tier: "pack12", appointmentTypeID: "95402055", productID: "2253278", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToTwo:trial", subjectId: "ap-psychology", format: "oneToTwo", tier: "trial", appointmentTypeID: "95402146", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToTwo:single", subjectId: "ap-psychology", format: "oneToTwo", tier: "single", appointmentTypeID: "95402102", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToTwo:pack6", subjectId: "ap-psychology", format: "oneToTwo", tier: "pack6", appointmentTypeID: "95402119", productID: "2253250", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-psychology:oneToTwo:pack12", subjectId: "ap-psychology", format: "oneToTwo", tier: "pack12", appointmentTypeID: "95402129", productID: "2253284", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },

    { id: "elegant-essays:oneToOne:trial", subjectId: "elegant-essays", format: "oneToOne", tier: "trial", appointmentTypeID: "96953095", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToOne:single", subjectId: "elegant-essays", format: "oneToOne", tier: "single", appointmentTypeID: "96953069", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToOne:pack6", subjectId: "elegant-essays", format: "oneToOne", tier: "pack6", appointmentTypeID: "96953131", productID: "2260520", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToOne:pack12", subjectId: "elegant-essays", format: "oneToOne", tier: "pack12", appointmentTypeID: "96953139", productID: "2260521", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToTwo:trial", subjectId: "elegant-essays", format: "oneToTwo", tier: "trial", appointmentTypeID: "96953108", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToTwo:single", subjectId: "elegant-essays", format: "oneToTwo", tier: "single", appointmentTypeID: "96953086", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToTwo:pack6", subjectId: "elegant-essays", format: "oneToTwo", tier: "pack6", appointmentTypeID: "96953156", productID: "2260522", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "elegant-essays:oneToTwo:pack12", subjectId: "elegant-essays", format: "oneToTwo", tier: "pack12", appointmentTypeID: "96953174", productID: "2260523", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },

    { id: "ap-english-language-composition:oneToOne:trial", subjectId: "ap-english-language-composition", format: "oneToOne", tier: "trial", appointmentTypeID: "96938198", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToOne:single", subjectId: "ap-english-language-composition", format: "oneToOne", tier: "single", appointmentTypeID: "96938134", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToOne:pack6", subjectId: "ap-english-language-composition", format: "oneToOne", tier: "pack6", appointmentTypeID: "96938268", productID: "2260524", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToOne:pack12", subjectId: "ap-english-language-composition", format: "oneToOne", tier: "pack12", appointmentTypeID: "96938304", productID: "2260525", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToTwo:trial", subjectId: "ap-english-language-composition", format: "oneToTwo", tier: "trial", appointmentTypeID: "96938230", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToTwo:single", subjectId: "ap-english-language-composition", format: "oneToTwo", tier: "single", appointmentTypeID: "96938155", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToTwo:pack6", subjectId: "ap-english-language-composition", format: "oneToTwo", tier: "pack6", appointmentTypeID: "96938331", productID: "2260526", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "ap-english-language-composition:oneToTwo:pack12", subjectId: "ap-english-language-composition", format: "oneToTwo", tier: "pack12", appointmentTypeID: "96938344", productID: "2260528", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },

    { id: "english-literature:oneToOne:trial", subjectId: "english-literature", format: "oneToOne", tier: "trial", appointmentTypeID: "96938820", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToOne:single", subjectId: "english-literature", format: "oneToOne", tier: "single", appointmentTypeID: "96938767", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToOne:pack6", subjectId: "english-literature", format: "oneToOne", tier: "pack6", appointmentTypeID: "96938876", productID: "2260529", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToOne:pack12", subjectId: "english-literature", format: "oneToOne", tier: "pack12", appointmentTypeID: "96938892", productID: "2260531", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToTwo:trial", subjectId: "english-literature", format: "oneToTwo", tier: "trial", appointmentTypeID: "96938841", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToTwo:single", subjectId: "english-literature", format: "oneToTwo", tier: "single", appointmentTypeID: "96938789", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToTwo:pack6", subjectId: "english-literature", format: "oneToTwo", tier: "pack6", appointmentTypeID: "96938926", productID: "2260532", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "english-literature:oneToTwo:pack12", subjectId: "english-literature", format: "oneToTwo", tier: "pack12", appointmentTypeID: "96938972", productID: "2260533", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },

    { id: "essay-writing-college-apps:oneToOne:trial", subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "trial", appointmentTypeID: "96952718", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToOne:single", subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "single", appointmentTypeID: "96952697", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToOne:pack6", subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "pack6", appointmentTypeID: "96952741", productID: "2260534", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToOne:pack12", subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "pack12", appointmentTypeID: "96952750", productID: "2260535", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToTwo:trial", subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "trial", appointmentTypeID: "96952729", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToTwo:single", subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "single", appointmentTypeID: "96952707", productID: "", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToTwo:pack6", subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "pack6", appointmentTypeID: "96952763", productID: "2260536", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true },
    { id: "essay-writing-college-apps:oneToTwo:pack12", subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "pack12", appointmentTypeID: "96952778", productID: "2260537", calendarID: DEFAULT_CALENDAR_ID, bookingLink: "", active: true }
  ];
}

function defaultBookingConfig() {
  return {
    version: 1,
    subjects: defaultSubjects(),
    services: defaultServices()
  };
}

function normalizeSubjectRecord(record, index = 0) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const name = cleanString(record.name);
  if (!name) {
    return null;
  }

  const slug = cleanString(record.slug) || slugify(name);
  const id = cleanString(record.id) || slug || crypto.randomUUID();

  return {
    id,
    name,
    slug: slug || id,
    label: cleanString(record.label) || name,
    note: cleanString(record.note),
    active: record.active !== false,
    order: Number.isFinite(Number(record.order)) ? Number(record.order) : index + 1
  };
}

function normalizeServiceRecord(record, index = 0) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const subjectId = cleanString(record.subjectId);
  const format = cleanString(record.format);
  const tier = cleanString(record.tier);
  const appointmentTypeID = cleanString(record.appointmentTypeID);
  const productID = cleanString(record.productID);
  const calendarID = cleanString(record.calendarID);
  const bookingLink = cleanString(record.bookingLink);
  const label = cleanString(record.label);
  const note = cleanString(record.note);
  const active = record.active !== false;

  if (!subjectId || !format || !tier) {
    return null;
  }

  const id = cleanString(record.id) || `${subjectId}:${format}:${tier}` || crypto.randomUUID();

  return {
    id,
    subjectId,
    format,
    tier,
    label: label || `${PACKAGE_LABELS[format] || format} - ${TIER_LABELS[tier] || tier}`,
    appointmentTypeID,
    productID,
    calendarID: calendarID || DEFAULT_CALENDAR_ID,
    bookingLink,
    note,
    active,
    order: Number.isFinite(Number(record.order)) ? Number(record.order) : index + 1
  };
}

function normalizeBookingConfig(value) {
  const subjects = Array.isArray(value?.subjects) ? value.subjects : [];
  const services = Array.isArray(value?.services) ? value.services : [];

  const normalizedSubjects = subjects
    .map((record, index) => normalizeSubjectRecord(record, index))
    .filter(Boolean)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));

  const subjectLookup = new Map(normalizedSubjects.map((subject) => [subject.id, subject]));

  const normalizedServices = services
    .map((record, index) => normalizeServiceRecord(record, index))
    .filter(Boolean)
    .map((service) => {
      const subject = subjectLookup.get(service.subjectId);
      return {
        ...service,
        subjectId: subject?.id || service.subjectId,
        subjectName: subject?.name || "",
        subjectSlug: subject?.slug || "",
        formatLabel: PACKAGE_LABELS[service.format] || service.format,
        tierLabel: TIER_LABELS[service.tier] || service.tier,
        packageKey: `${service.format}:${service.tier}`,
        mapped: Boolean(service.appointmentTypeID || service.bookingLink)
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.subjectName.localeCompare(b.subjectName));

  return {
    version: Number(value?.version) || 1,
    subjects: normalizedSubjects,
    services: normalizedServices
  };
}

function enrichBookingConfig(state) {
  const normalized = normalizeBookingConfig(state);
  const subjectLookup = new Map(normalized.subjects.map((subject) => [subject.id, subject]));

  return {
    ...normalized,
    subjects: normalized.subjects.map((subject) => ({
      ...subject,
      services: normalized.services
        .filter((service) => service.subjectId === subject.id)
        .map((service) => ({
          ...service,
          subjectName: subject.name,
          subjectSlug: subject.slug
        }))
    })),
    services: normalized.services.map((service) => ({
      ...service,
      subjectName: subjectLookup.get(service.subjectId)?.name || service.subjectName,
      subjectSlug: subjectLookup.get(service.subjectId)?.slug || service.subjectSlug
    })),
    serviceMap: normalized.services.reduce((acc, service) => {
      const subject = subjectLookup.get(service.subjectId);
      if (!subject) {
        return acc;
      }
      const key = `${subject.name}:${service.format}:${service.tier}`;
      acc[key] = {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectSlug: subject.slug,
        format: service.format,
        tier: service.tier,
        appointmentTypeID: service.appointmentTypeID,
        productID: service.productID,
        calendarID: service.calendarID,
        bookingLink: service.bookingLink,
        active: service.active !== false,
        mapped: Boolean(service.appointmentTypeID || service.bookingLink),
        label: service.label
      };
      return acc;
    }, {})
  };
}

function findSubjectBySelection(config, selection) {
  const name = cleanString(selection);
  if (!name) {
    return null;
  }

  const normalized = normalizeBookingConfig(config);
  return normalized.subjects.find((subject) =>
    subject.active !== false &&
    [subject.id, subject.slug, subject.name].includes(name)
  ) || null;
}

function findServiceForSelection(config, { subject, format, tier }) {
  const normalized = normalizeBookingConfig(config);
  const matchedSubject = findSubjectBySelection(normalized, subject);
  if (!matchedSubject) {
    return null;
  }

  return normalized.services.find((service) =>
    service.subjectId === matchedSubject.id &&
    service.active !== false &&
    service.format === cleanString(format) &&
    service.tier === cleanString(tier)
  ) || null;
}

function buildSelectionIndex(config) {
  const normalized = enrichBookingConfig(config);
  const index = {};
  normalized.subjects.forEach((subject) => {
    if (subject.active === false) {
      return;
    }
    subject.services.forEach((service) => {
      const key = `${subject.name}:${service.format}:${service.tier}`;
      index[key] = {
        ...service,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectSlug: subject.slug
      };
    });
  });
  return index;
}

async function readTextStream(stream) {
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function isVercelRuntime() {
  return cleanString(process.env.VERCEL) === "1" || Boolean(cleanString(process.env.VERCEL_ENV));
}

async function readBookingConfig() {
  try {
    const blob = await get(BLOB_PATH, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      const raw = await readTextStream(blob.stream);
      return enrichBookingConfig(parseJson(raw, defaultBookingConfig()));
    }
  } catch (error) {
    if (isVercelRuntime()) {
      const storageError = new Error("Booking configuration storage is not connected in Vercel. Add Vercel Blob to persist dashboard changes.");
      storageError.statusCode = 503;
      storageError.cause = error;
      throw storageError;
    }
  }

  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    return enrichBookingConfig(parseJson(raw, defaultBookingConfig()));
  } catch {
    return enrichBookingConfig(defaultBookingConfig());
  }
}

async function writeBookingConfig(state) {
  const normalized = normalizeBookingConfig(state);
  const serialized = JSON.stringify({
    version: normalized.version,
    subjects: normalized.subjects.map(({ services, subjectName, subjectSlug, formatLabel, tierLabel, packageKey, mapped, ...subject }) => subject),
    services: normalized.services.map(({ subjectName, subjectSlug, formatLabel, tierLabel, packageKey, mapped, ...service }) => service)
  }, null, 2);

  try {
    await put(BLOB_PATH, serialized, {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true
    });
    return enrichBookingConfig(JSON.parse(serialized));
  } catch (error) {
    if (isVercelRuntime()) {
      const storageError = new Error("Booking configuration storage is not connected in Vercel. Add Vercel Blob to persist dashboard changes.");
      storageError.statusCode = 503;
      storageError.cause = error;
      throw storageError;
    }
  }

  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, serialized, "utf8");
  return enrichBookingConfig(JSON.parse(serialized));
}

function listSubjectCatalog(config) {
  return enrichBookingConfig(config).subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    slug: subject.slug,
    label: subject.label,
    note: subject.note,
    active: subject.active !== false,
    order: subject.order,
    serviceCount: subject.services.length,
    mappedCount: subject.services.filter((service) => service.mapped).length
  }));
}

function listServiceCatalog(config) {
  return enrichBookingConfig(config).services.map((service) => ({
    id: service.id,
    subjectId: service.subjectId,
    subjectName: service.subjectName,
    subjectSlug: service.subjectSlug,
    format: service.format,
    tier: service.tier,
    label: service.label,
    appointmentTypeID: service.appointmentTypeID,
    productID: service.productID,
    calendarID: service.calendarID,
    bookingLink: service.bookingLink,
    note: service.note,
    active: service.active !== false,
    mapped: service.mapped,
    packageKey: service.packageKey,
    status: service.active === false
      ? "Inactive"
      : service.mapped
        ? "Connected"
        : "Needs Acuity mapping"
  }));
}

module.exports = {
  BLOB_PATH,
  LOCAL_PATH,
  DEFAULT_CALENDAR_ID,
  buildSelectionIndex,
  defaultBookingConfig,
  enrichBookingConfig,
  findServiceForSelection,
  findSubjectBySelection,
  listServiceCatalog,
  listSubjectCatalog,
  normalizeBookingConfig,
  normalizeServiceRecord,
  normalizeSubjectRecord,
  readBookingConfig,
  slugify,
  writeBookingConfig
};
