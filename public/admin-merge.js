(function (root) {
  function mergeRecords(baseRecords, draftRecords, latestRecords, key, fields, label) {
    const base = new Map(baseRecords.map((record) => [record[key], record]));
    const draft = new Map(draftRecords.map((record) => [record[key], record]));
    const latest = new Map(latestRecords.map((record) => [record[key], record]));
    const result = latestRecords.map((record) => ({ ...record }));
    const sameFields = (left, right) => fields.every((field) => JSON.stringify(left?.[field]) === JSON.stringify(right?.[field]));

    for (const [id, before] of base) {
      const edited = draft.get(id);
      const current = latest.get(id);
      const index = result.findIndex((record) => record[key] === id);
      if (!edited) {
        if (!current) continue;
        if (!sameFields(current, before)) throw new Error(`${label} changed by someone else. Your draft is still on screen; refresh and reapply your edit.`);
        result.splice(index, 1);
        continue;
      }
      if (!current) {
        if (sameFields(edited, before)) continue;
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
        if (!sameFields(current, edited)) throw new Error(`${label} already exists with different details. Your draft is still on screen; refresh and reapply your edit.`);
      } else result.unshift(edited);
    }
    return result;
  }

  function mergeObject(base, draft, latest, label = "These settings") {
    const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
    const plainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    function mergeValue(before, edited, current, path) {
      if (same(edited, before)) return current;
      if (same(current, before) || same(current, edited)) return edited;
      if (plainObject(before) && plainObject(edited) && plainObject(current)) {
        const merged = {};
        const keys = new Set([...Object.keys(before), ...Object.keys(edited), ...Object.keys(current)]);
        for (const key of keys) {
          const value = mergeValue(before[key], edited[key], current[key], `${path}.${key}`);
          if (value !== undefined) merged[key] = value;
        }
        return merged;
      }
      throw new Error(`${label} have a newer edit to ${path}. Your draft is still on screen; refresh to see the latest saved values, then reapply your change.`);
    }
    return mergeValue(base, draft, latest, label);
  }

  root.AdminMerge = { mergeObject, mergeRecords };
  if (typeof module !== "undefined" && module.exports) module.exports = root.AdminMerge;
})(typeof globalThis !== "undefined" ? globalThis : window);
