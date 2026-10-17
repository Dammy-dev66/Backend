const { head, put } = require("@vercel/blob");

function normalizeEtag(value) {
  return String(value || "").trim().replace(/^W\//i, "");
}

function conflictError(revisionChanged) {
  const error = new Error("This record changed while you were editing it. Refresh the dashboard and apply your changes again.");
  error.statusCode = 409;
  error.code = "BLOB_WRITE_CONFLICT";
  if (typeof revisionChanged === "boolean") error.revisionChanged = revisionChanged;
  return error;
}

async function conditionalBlobWrite(pathname, body, options = {}) {
  const { expectedEtag, ...putOptions } = options;
  const matchEtag = normalizeEtag(expectedEtag);
  try {
    return await put(pathname, body, {
      ...putOptions,
      access: "private",
      ...(matchEtag
        ? { ifMatch: matchEtag, allowOverwrite: true }
        : { allowOverwrite: false, addRandomSuffix: false })
    });
  } catch (error) {
    if (error?.statusCode === 412 || error?.status === 412 || error?.code === "PreconditionFailed" ||
      String(error?.message || "").includes("Precondition failed: ETag mismatch")) {
      let revisionChanged;
      try {
        const current = await head(pathname, { access: "private" });
        if (matchEtag) revisionChanged = normalizeEtag(current.etag) !== matchEtag;
      } catch {}
      throw conflictError(revisionChanged);
    }
    throw error;
  }
}

module.exports = { conditionalBlobWrite, conflictError, normalizeEtag };
