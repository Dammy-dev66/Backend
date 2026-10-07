const { put } = require("@vercel/blob");

function conflictError() {
  const error = new Error("This record changed while you were editing it. Refresh the dashboard and apply your changes again.");
  error.statusCode = 409;
  error.code = "BLOB_WRITE_CONFLICT";
  return error;
}

async function conditionalBlobWrite(pathname, body, options = {}) {
  const { expectedEtag, ...putOptions } = options;
  try {
    return await put(pathname, body, {
      ...putOptions,
      access: "private",
      ...(expectedEtag
        ? { ifMatch: expectedEtag, allowOverwrite: true }
        : { allowOverwrite: false, addRandomSuffix: false })
    });
  } catch (error) {
    if (error?.statusCode === 412 || error?.status === 412 || error?.code === "PreconditionFailed" ||
      String(error?.message || "").includes("Precondition failed: ETag mismatch")) {
      throw conflictError();
    }
    throw error;
  }
}

module.exports = { conditionalBlobWrite, conflictError };
