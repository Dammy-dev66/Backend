const { requireAdminKey } = require("../../lib/admin-auth");
const { handleOptions, readJson, sendJson } = require("../../lib/http");
const { defaultTemplates, normalizeTemplateState, readTemplateState, writeTemplateState } = require("../../lib/email-templates");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    requireAdminKey(req);
    if (req.method === "GET") return sendJson(req, res, 200, { ok: true, ...(await readTemplateState()), defaults: defaultTemplates().templates });
    if (req.method === "PUT") {
      const state = await writeTemplateState(normalizeTemplateState(await readJson(req)));
      return sendJson(req, res, 200, { ok: true, ...state, defaults: defaultTemplates().templates });
    }
    if (req.method === "POST") {
      const body = await readJson(req);
      const kind = String(body.kind || "");
      const defaults = defaultTemplates();
      if (!Object.prototype.hasOwnProperty.call(defaults.templates, kind)) {
        return sendJson(req, res, 400, { ok: false, error: "Unknown email template." });
      }
      const current = await readTemplateState();
      current.templates[kind] = defaults.templates[kind];
      const state = await writeTemplateState(current);
      return sendJson(req, res, 200, { ok: true, ...state, defaults: defaults.templates });
    }
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
