const test = require("node:test");
const assert = require("node:assert/strict");

const blobPath = require.resolve("@vercel/blob");
const helperPath = require.resolve("../lib/conditional-blob-write");

function loadWithPut(put) {
  const originalBlob = require.cache[blobPath];
  const originalHelper = require.cache[helperPath];
  require.cache[blobPath] = { exports: { put } };
  delete require.cache[helperPath];
  const helper = require("../lib/conditional-blob-write");
  return {
    ...helper,
    restore() {
      if (originalBlob) require.cache[blobPath] = originalBlob;
      else delete require.cache[blobPath];
      if (originalHelper) require.cache[helperPath] = originalHelper;
      else delete require.cache[helperPath];
    }
  };
}

test("a new private record is created once, while an update requires the exact ETag", async () => {
  const calls = [];
  const helper = loadWithPut(async (pathname, body, options) => {
    calls.push({ pathname, body, options });
    return { etag: `revision-${calls.length}` };
  });
  try {
    await helper.conditionalBlobWrite("finbar/test.json", "{}", { contentType: "application/json" });
    await helper.conditionalBlobWrite("finbar/test.json", "{\"next\":true}", {
      contentType: "application/json",
      expectedEtag: "revision-1"
    });
    assert.deepEqual(calls[0].options, {
      contentType: "application/json",
      access: "private",
      allowOverwrite: false,
      addRandomSuffix: false
    });
    assert.deepEqual(calls[1].options, {
      contentType: "application/json",
      access: "private",
      ifMatch: "revision-1",
      allowOverwrite: true
    });
  } finally {
    helper.restore();
  }
});

test("an ETag mismatch is reported as a retryable revision conflict", async () => {
  const helper = loadWithPut(async () => {
    throw new Error("Vercel Blob: Precondition failed: ETag mismatch.");
  });
  try {
    await assert.rejects(
      helper.conditionalBlobWrite("finbar/test.json", "{}", { expectedEtag: "old-revision" }),
      (error) => error.statusCode === 409 && error.code === "BLOB_WRITE_CONFLICT"
    );
  } finally {
    helper.restore();
  }
});
