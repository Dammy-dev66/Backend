function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function finitePrice(value) {
  const amount = Number(value);
  return value !== "" && value !== null && value !== undefined && Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : null;
}

function normalizeAcuityImport(appointmentTypes, products) {
  return {
    appointmentTypes: asArray(appointmentTypes).filter((item) => item && typeof item === "object").map((item) => ({
      id: text(item.id),
      name: text(item.name),
      description: text(item.description),
      type: text(item.type),
      active: item.active !== false,
      duration: Number.isFinite(Number(item.duration)) ? Number(item.duration) : null,
      price: finitePrice(item.price),
      category: text(item.category),
      calendarIDs: Array.isArray(item.calendarIDs) ? item.calendarIDs.map(text).filter(Boolean) : []
    })).filter((item) => item.id && item.name && item.active),
    products: asArray(products).filter((item) => item && typeof item === "object").map((item) => ({
      id: text(item.id),
      name: text(item.name),
      type: text(item.type),
      price: finitePrice(item.price),
      appointmentTypeIDs: Array.isArray(item.appointmentTypeIDs) ? item.appointmentTypeIDs.map(text).filter(Boolean) : [],
      appointmentTypeCounts: item.appointmentTypeCounts && typeof item.appointmentTypeCounts === "object" ? item.appointmentTypeCounts : {}
    })).filter((item) => item.id && item.name)
  };
}

function inferLessonDetails(name) {
  const value = text(name).toLowerCase();
  const format = /(?:1\s*:\s*2|two\s+students?|2\s+students?|pair)/i.test(value)
    ? "oneToTwo"
    : /(?:1\s*:\s*1|one\s+students?|single\s+student|one[- ]to[- ]one)/i.test(value)
      ? "oneToOne"
      : "";
  let tier = "";
  if (/\btrial\b/i.test(value)) tier = "trial";
  else if (/\b(?:12|twelve)[\s-]*(?:class|lesson)?\s*pack(?:age)?s?\b|\bpack12\b/i.test(value)) tier = "pack12";
  else if (/\b(?:6|six)[\s-]*(?:class|lesson)?\s*pack(?:age)?s?\b|\bpack6\b/i.test(value)) tier = "pack6";
  else if (/\bsingle\b/i.test(value)) tier = "single";
  return { format, tier };
}

function findPackageMatches(products, appointmentTypeID, count) {
  const id = text(appointmentTypeID);
  return asArray(products).filter((product) => {
    const ids = Array.isArray(product.appointmentTypeIDs) ? product.appointmentTypeIDs.map(text) : [];
    const counts = product.appointmentTypeCounts || {};
    return text(product.type).toLowerCase() === "appointments" && ids.includes(id) && Number(counts[id]) === count;
  });
}

module.exports = { findPackageMatches, inferLessonDetails, normalizeAcuityImport };
