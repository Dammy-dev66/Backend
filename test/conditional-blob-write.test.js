const test = require("node:test");
const assert = require("node:assert/strict");

const blobPath = require.resolve("@vercel/blob");
const helperPath = require.resolve("../lib/conditional-blob-write");

function loadWithPut(put, head = async () => ({ etag: "current-revision" })) {
  const originalBlob = require.cache[blobPath];
  const originalHelper = require.cache[helperPath];
  require.cache[blobPath] = { exports: { head, put } };
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
      (error) => error.statusCode === 409 && error.code === "BLOB_WRITE_CONFLICT" && error.revisionChanged === true
    );
  } finally {
    helper.restore();
  }
});

test("a weak ETag is normalized before a conditional Blob write", async () => {
  const calls = [];
  const helper = loadWithPut(async (_pathname, _body, options) => {
    calls.push(options);
    return { etag: "\"revision-2\"" };
  });
  try {
    await helper.conditionalBlobWrite("finbar/test.json", "{}", {
      expectedEtag: "W/\"revision-1\""
    });
    assert.equal(calls[0].ifMatch, "\"revision-1\"");
    assert.equal(calls[0].allowOverwrite, true);
  } finally {
    helper.restore();
  }
});

test("ledger updates recover after repeated short-lived Blob revision conflicts", async () => {
  const operationsPath = require.resolve("../lib/operations-ledger");
  const originalOperations = require.cache[operationsPath];
  const originalBlob = require.cache[blobPath];
  const originalHelper = require.cache[helperPath];
  const previousVercel = process.env.VERCEL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  let content = JSON.stringify({ version: 1, packages: [], receipts: [], appointments: [], actions: [], stripeEvents: [], policySnapshots: [], lastBackfillAt: "", backfillVersion: 2, stripeBackfillCursor: "", backfillError: "" });
  let etag = "revision-0";
  let attempts = 0;
  const expectedEtags = [];
  process.env.VERCEL = "1";
  delete process.env.VERCEL_ENV;
  require.cache[blobPath] = { exports: { head: async () => ({ etag }), get: async () => ({
    statusCode: 200,
    stream: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(content)); controller.close(); } }),
    blob: { etag: `W/${etag}` }
  }) } };
  require.cache[helperPath] = { exports: {
    conditionalBlobWrite: async (_pathname, body, options) => {
      attempts += 1;
      expectedEtags.push(options.expectedEtag);
      if (attempts <= 5) throw Object.assign(new Error("revision conflict"), { statusCode: 409 });
      content = body;
      etag = `revision-${attempts}`;
      return { etag };
    }
  } };
  delete require.cache[operationsPath];
  try {
    const { updateLedger } = require("../lib/operations-ledger");
    const result = await updateLedger((state) => {
      state.lastBackfillAt = "2026-10-11T00:00:00.000Z";
      return state;
    });
    assert.equal(attempts, 6);
    assert.deepEqual(expectedEtags, ["revision-0", "revision-0", "revision-0", "revision-0", "revision-0", "revision-0"]);
    assert.equal(result.lastBackfillAt, "2026-10-11T00:00:00.000Z");
  } finally {
    delete require.cache[operationsPath];
    if (originalOperations) require.cache[operationsPath] = originalOperations;
    if (originalBlob) require.cache[blobPath] = originalBlob; else delete require.cache[blobPath];
    if (originalHelper) require.cache[helperPath] = originalHelper; else delete require.cache[helperPath];
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});
