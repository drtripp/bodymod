export const fallbackBloodworkLibrary = {
  version: 1,
  reference: "Local fallback bloodwork marker library; backend source unavailable.",
  notes: [
    "Informational local scaffold only; not medical advice.",
    "Bloodwork logs stay local-only and are excluded from server share dashboards."
  ],
  markerGroups: [
    { id: "hormones", label: "Hormones", summary: "Hormone markers for local tracking." },
    { id: "lipids", label: "Lipids", summary: "Lipid markers for local tracking." },
    { id: "metabolic", label: "Metabolic", summary: "Metabolic markers for local tracking." }
  ],
  markers: [
    {
      id: "total-testosterone",
      label: "Total testosterone",
      groupId: "hormones",
      unit: "ng/dL",
      summary: "Total testosterone marker; interpretation depends on clinical context.",
      referenceRanges: {
        male: { low: 300, high: 1000, unit: "ng/dL" },
        female: { low: 15, high: 70, unit: "ng/dL" }
      },
      commonPanels: ["hormone"],
      requiresHumanReview: true
    },
    {
      id: "estradiol",
      label: "Estradiol",
      groupId: "hormones",
      unit: "pg/mL",
      summary: "Estradiol marker; ranges vary by cycle, therapy, and assay.",
      referenceRanges: {
        male: { low: 10, high: 40, unit: "pg/mL" },
        female: { low: 15, high: 350, unit: "pg/mL" }
      },
      commonPanels: ["hormone"],
      requiresHumanReview: true
    },
    {
      id: "ldl-c",
      label: "LDL-C",
      groupId: "lipids",
      unit: "mg/dL",
      summary: "LDL cholesterol marker; displayed without risk diagnosis.",
      referenceRanges: {
        general: { low: 0, high: 100, unit: "mg/dL" }
      },
      commonPanels: ["lipid"],
      requiresHumanReview: true
    },
    {
      id: "fasting-glucose",
      label: "Fasting glucose",
      groupId: "metabolic",
      unit: "mg/dL",
      summary: "Fasting glucose marker; preserve fasting context in notes.",
      referenceRanges: {
        general: { low: 70, high: 99, unit: "mg/dL" }
      },
      commonPanels: ["metabolic"],
      requiresHumanReview: true
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value) {
  return String(value || "").trim();
}

function normalizeReferenceRange(range = {}, fallbackUnit = "") {
  const low = range.low === null || range.low === undefined || range.low === ""
    ? null
    : Number(range.low);
  const high = range.high === null || range.high === undefined || range.high === ""
    ? null
    : Number(range.high);

  return {
    low: Number.isFinite(low) ? low : null,
    high: Number.isFinite(high) ? high : null,
    unit: stringValue(range.unit || fallbackUnit)
  };
}

function normalizeMarker(marker = {}) {
  const unit = stringValue(marker.unit);
  const referenceRanges = Object.fromEntries(
    Object.entries(marker.referenceRanges || {}).map(([key, range]) => [
      key,
      normalizeReferenceRange(range, unit)
    ])
  );

  return {
    id: stringValue(marker.id),
    label: stringValue(marker.label || marker.id || "Lab marker"),
    groupId: stringValue(marker.groupId || "general"),
    unit,
    summary: stringValue(marker.summary),
    referenceRanges,
    commonPanels: safeArray(marker.commonPanels).map(stringValue).filter(Boolean),
    requiresHumanReview: marker.requiresHumanReview !== false
  };
}

export function normalizeBloodworkLibrary(payload) {
  const source = payload && typeof payload === "object" ? payload : fallbackBloodworkLibrary;
  const markerGroups = safeArray(source.markerGroups)
    .map((group) => ({
      id: stringValue(group.id),
      label: stringValue(group.label || group.id || "Group"),
      summary: stringValue(group.summary)
    }))
    .filter((group) => group.id);
  const markers = safeArray(source.markers)
    .map(normalizeMarker)
    .filter((marker) => marker.id);

  if (!markerGroups.length || !markers.length) {
    return normalizeBloodworkLibrary(fallbackBloodworkLibrary);
  }

  return {
    version: Number(source.version || 1),
    reference: stringValue(source.reference || fallbackBloodworkLibrary.reference),
    notes: safeArray(source.notes).map(stringValue).filter(Boolean),
    markerGroups,
    markers
  };
}

export function bloodworkMarkerById(library, markerId) {
  return normalizeBloodworkLibrary(library).markers.find((marker) => marker.id === markerId) || null;
}

export function referenceRangeForMarker(marker = {}, sex = "general") {
  const ranges = marker.referenceRanges || {};
  return ranges[sex] || ranges.general || ranges.male || ranges.female || null;
}

export function formatReferenceRange(range) {
  if (!range) {
    return "No range";
  }

  if (range.low !== null && range.high !== null) {
    return `${range.low}-${range.high} ${range.unit}`;
  }

  if (range.low !== null) {
    return `>= ${range.low} ${range.unit}`;
  }

  if (range.high !== null) {
    return `<= ${range.high} ${range.unit}`;
  }

  return range.unit || "No range";
}

export function bloodworkRangeStatus(value, range) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !range) {
    return "no-range";
  }

  if (range.low !== null && numeric < range.low) {
    return "below-range";
  }

  if (range.high !== null && numeric > range.high) {
    return "above-range";
  }

  return "in-range";
}

export function createBloodworkResult({
  marker,
  value,
  collectedAt,
  note = "",
  protocolId = "",
  sex = "general"
} = {}) {
  const normalizedMarker = normalizeMarker(marker);
  const numericValue = Number(value);
  if (!normalizedMarker.id) {
    throw new Error("Choose a bloodwork marker.");
  }
  if (!Number.isFinite(numericValue)) {
    throw new Error("Enter a numeric lab value.");
  }

  const date = stringValue(collectedAt) || new Date().toISOString().slice(0, 10);
  const range = referenceRangeForMarker(normalizedMarker, sex);
  const status = bloodworkRangeStatus(numericValue, range);

  return {
    schemaVersion: 1,
    markerId: normalizedMarker.id,
    markerLabel: normalizedMarker.label,
    groupId: normalizedMarker.groupId,
    value: numericValue,
    unit: normalizedMarker.unit,
    collectedAt: date,
    referenceRange: range,
    rangeStatus: status,
    protocolId: stringValue(protocolId),
    note: stringValue(note),
    localOnlySensitive: true,
    requiresHumanReview: normalizedMarker.requiresHumanReview
  };
}

function dateMs(record = {}) {
  const parsed = new Date(record.collectedAt || record.createdAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sparklinePoints(results = [], width = 100, height = 36, padding = 4) {
  if (results.length < 2) {
    return "";
  }

  const values = results.map((result) => Number(result.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const xStep = (width - padding * 2) / Math.max(1, results.length - 1);

  return results
    .map((result, index) => {
      const x = padding + xStep * index;
      const y = height - padding - ((Number(result.value) - minValue) / span) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function buildBloodworkTrendRows(results = []) {
  const grouped = new Map();

  for (const result of safeArray(results)) {
    const key = result.markerId || result.markerLabel;
    if (!key) {
      continue;
    }
    grouped.set(key, [...(grouped.get(key) || []), result]);
  }

  return Array.from(grouped.values())
    .map((items) => {
      const sorted = items.slice().sort((left, right) => dateMs(left) - dateMs(right));
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2] || null;
      const delta = previous ? Number((Number(latest.value) - Number(previous.value)).toFixed(2)) : null;

      return {
        markerId: latest.markerId,
        markerLabel: latest.markerLabel,
        unit: latest.unit,
        count: sorted.length,
        latestValue: latest.value,
        latestStatus: latest.rangeStatus,
        latestAt: latest.collectedAt || latest.createdAt,
        delta,
        points: sparklinePoints(sorted),
        results: sorted
      };
    })
    .sort((left, right) => new Date(right.latestAt || 0) - new Date(left.latestAt || 0));
}

export function formatBloodworkResult(result = {}) {
  return `${result.markerLabel || "Lab marker"}: ${result.value} ${result.unit || ""}`.trim();
}
