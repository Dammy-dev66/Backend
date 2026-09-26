const { handleOptions, readJson, sendJson } = require("../lib/http");
const {
  enrichBookingConfig,
  listServiceCatalog,
  listSubjectCatalog,
  normalizeBookingConfig,
  readBookingConfig,
  writeBookingConfig
} = require("../lib/booking-config");
const { listPackageKeys, PACKAGE_LABELS, TIER_LABELS } = require("../lib/pricing");
const { readPriceState } = require("../lib/price-config");

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

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET" && req.method !== "PUT") {
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    if (req.method === "GET") {
      const [config, pricing] = await Promise.all([readBookingConfig(), readPriceState()]);
      const enrichedConfig = enrichBookingConfig(config);
      return sendJson(req, res, 200, {
        ok: true,
        version: enrichedConfig.version,
        subjects: listSubjectCatalog(enrichedConfig),
        services: listServiceCatalog(enrichedConfig),
        packageCatalog: buildPackageCatalog(),
        serviceMap: enrichedConfig.serviceMap,
        pricing
      });
    }

    requireAdminKey(req);
    const body = await readJson(req);
    const config = normalizeBookingConfig({
      version: body?.version,
      subjects: Array.isArray(body?.subjects) ? body.subjects : [],
      services: Array.isArray(body?.services) ? body.services : []
    });
    const saved = await writeBookingConfig(config);
    const enriched = enrichBookingConfig(saved);
    return sendJson(req, res, 200, {
      ok: true,
      version: enriched.version,
      subjects: listSubjectCatalog(enriched),
      services: listServiceCatalog(enriched),
      packageCatalog: buildPackageCatalog(),
      serviceMap: enriched.serviceMap
    });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, {
      ok: false,
      error: error.message
    });
  }
};
