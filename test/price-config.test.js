const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultPriceState, normalizePriceState, resolvePriceFromState, validatePriceStateInput } = require("../lib/price-config");

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

test("dashboard price saves reject blank or malformed amounts before normalization", () => {
  const pricing = defaultPriceState();
  pricing.subjectPrices.psychology = JSON.parse(JSON.stringify(pricing.prices));
  assert.doesNotThrow(() => validatePriceStateInput(pricing));

  pricing.subjectPrices.psychology.oneToOne.single = "";
  assert.throws(() => validatePriceStateInput(pricing), /psychology: oneToOne single/);
  assert.equal(normalizePriceState(pricing).subjectPrices.psychology.oneToOne.single, pricing.prices.oneToOne.single);

  pricing.subjectPrices.psychology.oneToOne.single = "not a price";
  assert.throws(() => validatePriceStateInput(pricing), /psychology: oneToOne single/);

  pricing.subjectPrices.psychology.oneToOne.single = false;
  assert.throws(() => validatePriceStateInput(pricing), /psychology: oneToOne single/);

  pricing.subjectPrices.psychology.oneToOne.single = 31.555;
  assert.throws(() => validatePriceStateInput(pricing), /psychology: oneToOne single/);

  pricing.subjectPrices.psychology.oneToOne.single = 0;
  assert.doesNotThrow(() => validatePriceStateInput(pricing));
});

test("version-one production prices survive the subject-pricing migration", () => {
  const previous = {
    version: 1,
    currency: "EUR",
    prices: {
      oneToOne: { trial: 35, single: 70, pack6: 390, pack12: 720 },
      oneToTwo: { trial: 50, single: 100, pack6: 540, pack12: 960 }
    }
  };
  const migrated = normalizePriceState(previous);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.prices, previous.prices);
  assert.deepEqual(migrated.subjectPrices, {});
  assert.equal(resolvePriceFromState(migrated, "ap-psychology", "oneToOne", "single"), 70);
  assert.equal(resolvePriceFromState(migrated, "english-literature", "oneToTwo", "pack6"), 540);
});
