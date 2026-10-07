const VALIDITY_WEEKS = Object.freeze({ trial: 6, single: 6, pack6: 12, pack12: 20 });

function validityWeeks(tier) {
  return Object.hasOwn(VALIDITY_WEEKS, tier) ? VALIDITY_WEEKS[tier] : null;
}

function packageExpiryAt(record) {
  if (!record || record.linkedManually || !record.purchasedAt) return null;
  const weeks = validityWeeks(record.tier);
  const purchasedAt = new Date(record.purchasedAt);
  if (!weeks || Number.isNaN(purchasedAt.getTime())) return null;
  purchasedAt.setUTCDate(purchasedAt.getUTCDate() + weeks * 7);
  return purchasedAt;
}

module.exports = { packageExpiryAt, validityWeeks };
