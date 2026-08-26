const PACKAGE_PRICES = {
  oneToOne: {
    trial: 25,
    single: 50,
    pack6: 264,
    pack12: 456
  },
  oneToTwo: {
    trial: 35,
    single: 70,
    pack6: 360,
    pack12: 648
  }
};

const PACKAGE_LABELS = {
  oneToOne: "Tutor + one student",
  oneToTwo: "Tutor + two students"
};

const TIER_LABELS = {
  trial: "Trial class",
  single: "Single lesson",
  pack6: "6-class package",
  pack12: "12-class package"
};

function listPackageKeys() {
  return Object.entries(PACKAGE_PRICES).flatMap(([format, tiers]) =>
    Object.keys(tiers).map((tier) => `${format}:${tier}`)
  );
}

function resolveBasePrice(format, tier) {
  const value = PACKAGE_PRICES[format]?.[tier];
  return Number.isFinite(value) ? value : null;
}

function resolvePackageLabel(format, tier) {
  const formatLabel = PACKAGE_LABELS[format] || format;
  const tierLabel = TIER_LABELS[tier] || tier;
  return `${formatLabel} - ${tierLabel}`;
}

module.exports = {
  PACKAGE_PRICES,
  PACKAGE_LABELS,
  TIER_LABELS,
  listPackageKeys,
  resolveBasePrice,
  resolvePackageLabel
};
