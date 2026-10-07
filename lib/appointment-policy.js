const LATE_CHANGE_WINDOW_MS = 12 * 60 * 60 * 1000;

function isWithinLateChangeWindow(datetime, now = Date.now()) {
  const startsAt = new Date(datetime).getTime();
  const remaining = startsAt - now;
  return Number.isFinite(startsAt) && Number.isFinite(now) && remaining > 0 && remaining <= LATE_CHANGE_WINDOW_MS;
}

module.exports = { LATE_CHANGE_WINDOW_MS, isWithinLateChangeWindow };
