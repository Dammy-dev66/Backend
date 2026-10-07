const { BlobNotFoundError } = require("@vercel/blob");

function isMissingBlob(error) {
  return error instanceof BlobNotFoundError || error?.code === "not_found";
}

module.exports = { isMissingBlob };
