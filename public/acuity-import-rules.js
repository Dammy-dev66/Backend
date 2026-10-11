(() => {
  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.results)) return value.results;
    return [];
  }

  function text(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function inferLessonDetails(name) {
    const value = String(name || "").toLowerCase();
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

  function findRelatedPackages(products, appointmentTypeID) {
    const id = text(appointmentTypeID);
    return asArray(products).filter((product) =>
      text(product.type).toLowerCase() === "appointments" &&
      Array.isArray(product.appointmentTypeIDs) && product.appointmentTypeIDs.map(text).includes(id)
    );
  }

  const rules = { findPackageMatches, findRelatedPackages, inferLessonDetails };
  if (typeof module !== "undefined" && module.exports) module.exports = rules;
  else window.AcuityImportRules = rules;
})();
