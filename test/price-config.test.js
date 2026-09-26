const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultPriceState, normalizePriceState } = require("../lib/price-config");

test("price configuration keeps a complete EUR price matrix and rejects invalid amounts", () => {
  const defaults = defaultPriceState();
  const pricing = normalizePriceState({
    currency: "USD",
    prices: {
      oneToOne: { trial: 31.555, pack6: -1 },
      oneToTwo: { pack12: 700.1 }
    }
  });

  assert.equal(pricing.currency, "EUR");
  assert.equal(pricing.prices.oneToOne.trial, 31.56);
  assert.equal(pricing.prices.oneToOne.pack6, defaults.prices.oneToOne.pack6);
  assert.equal(pricing.prices.oneToTwo.pack12, 700.1);
  assert.equal(pricing.prices.oneToTwo.single, defaults.prices.oneToTwo.single);
});
