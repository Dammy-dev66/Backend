(function (root) {
  function sameFields(left, right, fields) {
    return fields.every((field) => JSON.stringify(left?.[field]) === JSON.stringify(right?.[field]));
  }

  function mergeRecords(baseRecords, draftRecords, latestRecords, key, fields, label) {
    const base = new Map(baseRecords.map((record) => [record[key], record]));
    const draft = new Map(draftRecords.map((record) => [record[key], record]));
    const latest = new Map(latestRecords.map((record) => [record[key], record]));
    const result = [...latestRecords];

    for (const [id, before] of base) {
      const edited = draft.get(id);
      const current = latest.get(id);
      const index = result.findIndex((record) => record[key] === id);
      if (!edited) {
        if (!current) continue;
        if (!sameFields(current, before, fields)) throw new Error(`${label} was changed by someone else. Your draft is still on screen; refresh and reapply your edit.`);
        result.splice(index, 1);
        continue;
      }
      if (!current) {
        if (sameFields(edited, before, fields)) continue;
        throw new Error(`${label} was removed by someone else. Your draft is still on screen; refresh and reapply your edit.`);
      }

      const merged = { ...current };
      for (const field of fields) {
        const changedHere = JSON.stringify(edited[field]) !== JSON.stringify(before[field]);
        const changedThere = JSON.stringify(current[field]) !== JSON.stringify(before[field]);
        if (!changedHere) continue;
        if (changedThere && JSON.stringify(current[field]) !== JSON.stringify(edited[field])) {
          throw new Error(`${label} has a newer edit to the same field. Your draft is still on screen; refresh and reapply your edit.`);
        }
        merged[field] = edited[field];
      }
      if (index >= 0) result[index] = merged;
    }

    for (const [id, edited] of draft) {
      if (base.has(id)) continue;
      const current = latest.get(id);
      if (current) {
        if (!sameFields(current, edited, fields)) throw new Error(`${label} already exists with different details. Your draft is still on screen; refresh and reapply your edit.`);
      } else {
        result.unshift(edited);
      }
    }
    return result;
  }

  const api = { mergeRecords };
  root.AdminMerge = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
