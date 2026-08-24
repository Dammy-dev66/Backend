const { handleOptions, readJson, sendJson } = require("../../lib/http");
const { listPackageKeys, PACKAGE_LABELS, TIER_LABELS } = require("../../lib/pricing");
const { normalizeCouponRecord, readCouponState, writeCouponState } = require("../../lib/coupons");

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
  const coupons = Array.isArray(body?.coupons) ? body.coupons : [];
  return {
    version: 1,
    coupons: coupons.map(normalizeCouponRecord).filter(Boolean)
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    requireAdminKey(req);

    if (req.method === "GET") {
      const state = await readCouponState();
      return sendJson(req, res, 200, {
        ok: true,
        coupons: state.coupons,
        packageCatalog: buildPackageCatalog()
      });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const state = await writeCouponState(normalizeStateBody(body));
      return sendJson(req, res, 200, {
        ok: true,
        coupons: state.coupons,
        packageCatalog: buildPackageCatalog()
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
