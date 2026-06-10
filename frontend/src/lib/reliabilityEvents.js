const DAY_MS = 24 * 60 * 60 * 1000;

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFieldList(fields = []) {
  return Array.isArray(fields)
    ? fields.map((field) => String(field).trim()).filter(Boolean)
    : [];
}

export function affectedFieldsForEvent(event = {}) {
  return normalizeFieldList(event.affectedFields);
}

export function eventAffectsField(event = {}, fieldName = "") {
  const fields = affectedFieldsForEvent(event);
  return fields.includes("all") || fields.includes(fieldName);
}

export function buildReliabilityWindows(checkIns = [], fieldName = "", now = Date.now()) {
  return checkIns
    .filter((checkIn) => checkIn?.type === "life-event" && eventAffectsField(checkIn, fieldName))
    .map((event) => {
      const startMs = timestampMs(event.createdAt);
      const durationDays = Math.max(0, Number(event.durationDays || 0));
      const endMs = startMs + durationDays * DAY_MS;

      return {
        id: event.id,
        eventMode: event.eventMode || "life-event",
        affectedFields: affectedFieldsForEvent(event),
        note: event.note || "",
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(endMs).toISOString(),
        durationDays,
        isActive: timestampMs(now) >= startMs && timestampMs(now) <= endMs
      };
    })
    .sort((left, right) => timestampMs(left.startAt) - timestampMs(right.startAt));
}

export function isTimestampPausedByWindows(timestamp, windows = []) {
  const valueMs = timestampMs(timestamp);
  return windows.some(
    (window) => valueMs >= timestampMs(window.startAt) && valueMs <= timestampMs(window.endAt)
  );
}

export function isFieldPausedAt(checkIns = [], fieldName = "", timestamp = Date.now()) {
  return isTimestampPausedByWindows(
    timestamp,
    buildReliabilityWindows(checkIns, fieldName, timestamp)
  );
}

export function filterReliableEntries(entries = [], checkIns = [], fieldName = "") {
  const windows = buildReliabilityWindows(checkIns, fieldName);
  return entries.filter((entry) => !isTimestampPausedByWindows(entry.createdAt, windows));
}

export function buildReliabilityPauseSummary({
  checkIns = [],
  fieldName = "",
  entries = [],
  now = Date.now()
} = {}) {
  const windows = buildReliabilityWindows(checkIns, fieldName, now);
  const pausedEntryCount = entries.filter((entry) =>
    isTimestampPausedByWindows(entry.createdAt, windows)
  ).length;
  const activeWindows = windows.filter((window) => window.isActive);
  const latestWindow = windows[windows.length - 1] || null;

  return {
    fieldName,
    windows,
    activeWindows,
    latestWindow,
    pausedEntryCount,
    isPaused: activeWindows.length > 0
  };
}
