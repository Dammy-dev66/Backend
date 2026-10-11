(() => {
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

  if (typeof module !== "undefined" && module.exports) module.exports = { inferLessonDetails };
  else window.AcuityImportRules = { inferLessonDetails };
})();
