const { handleOptions, readJson, sendJson } = require("../../lib/http");
const { listPackageKeys, PACKAGE_LABELS, TIER_LABELS } = require("../../lib/pricing");
const { normalizeCouponRecord, readCouponState, writeCouponState } = require("../../lib/coupons");
const { handleDashboardResource } = require("../../lib/admin-dashboard-api");
const { cleanString, requireAdminKey } = require("../../lib/admin-auth");

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
    coupons: coupons.map(normalizeCouponRecord).filter(Boolean),
    _revision: cleanString(body?._revision)
  };
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  res.setHeader?.("Cache-Control", "private, no-store, max-age=0");

  const url = new URL(req.url || "/", "http://localhost");
  const resource = req.query?.resource || url.searchParams.get("resource");
  if (resource) return handleDashboardResource(req, res, resource);

  try {
    requireAdminKey(req);

    if (req.method === "GET") {
      const state = await readCouponState();
      return sendJson(req, res, 200, {
        ok: true,
        coupons: state.coupons,
        _revision: state._revision || "",
        packageCatalog: buildPackageCatalog()
      });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const state = await writeCouponState({ ...normalizeStateBody(body), _revision: cleanString(body?._revision) });
      return sendJson(req, res, 200, {
        ok: true,
        coupons: state.coupons,
        _revision: state._revision || "",
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
