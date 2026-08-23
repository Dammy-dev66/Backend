const test = require("node:test");
const assert = require("node:assert/strict");

const { applyDiscount, resolveBasePrice } = require("../api/checkout-quote");

test("resolveBasePrice returns the configured package price", () => {
  assert.equal(resolveBasePrice("oneToOne", "pack6"), 264);
  assert.equal(resolveBasePrice("oneToTwo", "pack12"), 648);
  assert.equal(resolveBasePrice("bogus", "pack12"), null);
});

test("applyDiscount clamps the discount and total cleanly", () => {
  assert.deepEqual(applyDiscount(100, { type: "percent", value: 25 }), {
    discountAmount: 25,
    totalPrice: 75
  });

  assert.deepEqual(applyDiscount(100, { type: "amount", value: 250 }), {
    discountAmount: 100,
    totalPrice: 0
  });
});

