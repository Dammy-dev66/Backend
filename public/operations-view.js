(function (root) {
  function isCanceled(item) {
    return item.canceled === true || String(item.status || "").toLowerCase() === "canceled";
  }

  function filterOperations(items, view, today) {
    const date = today || new Date().toISOString().slice(0, 10);
    return (items || []).filter((item) => {
      if (view === "all") return true;
      if (view === "today") return !isCanceled(item) && item.date === date;
      if (view === "upcoming") return !isCanceled(item) && item.date >= date;
      if (view === "recent") return !isCanceled(item) && item.date < date;
      if (view === "canceled") return isCanceled(item);
      return false;
    });
  }

  const api = { filterOperations };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OperationsView = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
