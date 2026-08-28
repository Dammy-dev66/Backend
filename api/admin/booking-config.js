const { handleOptions, readJson, sendJson } = require("../../lib/http");
const { listPackageKeys, PACKAGE_LABELS, TIER_LABELS } = require("../../lib/pricing");
const {
  enrichBookingConfig,
  listServiceCatalog,
  listSubjectCatalog,
  normalizeBookingConfig,
  readBookingConfig,
  writeBookingConfig
} = require("../../lib/booking-config");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdminKey(req) {
  const configured = cleanString(process.env.FINBAR_ADMIN_KEY);
  if (!configured) {
    const error = new Error("Admin access is not configured yet.");
    error.statusCode = 503;
    throw error;
  }

  const provided = cleanString(req.headers["x-finbar-admin-key"]);
  if (!provided || provided !== configured) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

function buildPackageCatalog() {
  return listPackageKeys().map((key) => {
    const [format, tier] = key.split(":");
    return {
      key,
      format,
      tier,
      label: `${PACKAGE_LABELS[format] || format} - ${TIER_LABELS[tier] || tier}`
    };
  });
}

function normalizeStateBody(body) {
  const config = normalizeBookingConfig({
    version: body?.version,
    subjects: Array.isArray(body?.subjects) ? body.subjects : [],
    services: Array.isArray(body?.services) ? body.services : []
  });

  return {
    version: config.version,
    subjects: config.subjects,
    services: config.services.map(({ subjectName, subjectSlug, formatLabel, tierLabel, packageKey, mapped, ...service }) => service)
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    requireAdminKey(req);

    if (req.method === "GET") {
      const config = enrichBookingConfig(await readBookingConfig());
      return sendJson(req, res, 200, {
        ok: true,
        version: config.version,
        subjects: listSubjectCatalog(config),
        services: listServiceCatalog(config),
        packageCatalog: buildPackageCatalog(),
        serviceMap: config.serviceMap
      });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const state = await writeBookingConfig(normalizeStateBody(body));
      const config = enrichBookingConfig(state);
      return sendJson(req, res, 200, {
        ok: true,
        version: config.version,
        subjects: listSubjectCatalog(config),
        services: listServiceCatalog(config),
        packageCatalog: buildPackageCatalog(),
        serviceMap: config.serviceMap
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
