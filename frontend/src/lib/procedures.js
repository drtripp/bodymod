const DAY_MS = 24 * 60 * 60 * 1000;

export const fallbackProcedureLibrary = {
  version: 1,
  reference: "Local fallback procedure taxonomy seed; backend source unavailable.",
  notes: [
    "Informational local scaffold only; not medical advice.",
    "Use healing windows to pause interpretation, not to make recommendations."
  ],
  procedureTypes: [
    {
      id: "large-tattoo-session",
      label: "Large tattoo session",
      category: "tattoo",
      summary: "Track a tattoo session with local notes, body photos, and a short healing window.",
      defaultHealingDays: 28,
      affectedFields: ["bicepCircumference", "upperForearmCircumference", "upperThighCircumference", "calfCircumference"],
      photoCategory: "body",
      riskLevel: "body-mod review",
      reviewStatus: "fallback seed needs review",
      requiresHumanReview: true,
      timeline: [
        { day: 0, label: "Session day", summary: "Save baseline notes and optional before photo." },
        { day: 28, label: "Window review", summary: "Review after the placeholder healing window." }
      ],
      caseLogPrompts: ["placement", "aftercare notes", "affected measurements"]
    },
    {
      id: "facial-filler",
      label: "Facial filler or injectable",
      category: "filler",
      summary: "Dated local log for face-focused procedures and swelling-window pausing.",
      defaultHealingDays: 21,
      affectedFields: ["headCircumference", "neckCircumference"],
      photoCategory: "face",
      riskLevel: "clinical review",
      reviewStatus: "fallback seed needs review",
      requiresHumanReview: true,
      timeline: [
        { day: 0, label: "Treatment day", summary: "Save neutral notes and photo reference." },
        { day: 21, label: "Window review", summary: "Use the case log for discussion, not advice." }
      ],
      caseLogPrompts: ["area", "side/front photo reference", "measurement fields paused"]
    },
    {
      id: "orthognathic-or-jaw-surgery",
      label: "Jaw or orthognathic surgery",
      category: "surgery",
      summary: "High-risk profile procedure log for side-profile photos and long healing windows.",
      defaultHealingDays: 180,
      affectedFields: ["headCircumference", "neckCircumference"],
      photoCategory: "face",
      riskLevel: "high-risk clinical review",
      reviewStatus: "fallback seed needs specialist review",
      requiresHumanReview: true,
      timeline: [
        { day: 0, label: "Surgery date", summary: "Record factual case-log context only." },
        { day: 180, label: "Long-window review", summary: "Review with clinician-provided context." }
      ],
      caseLogPrompts: ["side-profile photo stream", "clinician constraints", "healing-window dates"]
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function dateMs(value) {
  const date = normalizeDate(value);
  const parsed = new Date(`${date}T00:00:00.000Z`).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(value, days) {
  const duration = Math.max(0, Number(days) || 0);
  return new Date(dateMs(value) + duration * DAY_MS).toISOString().slice(0, 10);
}

function normalizeFields(value) {
  const fields = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim());

  return [...new Set(fields.filter(Boolean))];
}

function normalizeProcedureType(item = {}) {
  const defaultHealingDays = Math.max(1, Number(item.defaultHealingDays) || 30);

  return {
    id: String(item.id || "").trim(),
    label: String(item.label || item.id || "Procedure").trim(),
    category: String(item.category || "procedure").trim(),
    summary: String(item.summary || "").trim(),
    defaultHealingDays,
    affectedFields: normalizeFields(item.affectedFields),
    photoCategory: String(item.photoCategory || "body").trim(),
    riskLevel: String(item.riskLevel || "human review").trim(),
    reviewStatus: String(item.reviewStatus || "needs review").trim(),
    requiresHumanReview: item.requiresHumanReview !== false,
    timeline: safeArray(item.timeline).map((entry) => ({
      day: Math.max(0, Number(entry.day) || 0),
      label: String(entry.label || `Day ${entry.day || 0}`).trim(),
      summary: String(entry.summary || "").trim()
    })),
    caseLogPrompts: safeArray(item.caseLogPrompts).map((prompt) => String(prompt).trim()).filter(Boolean)
  };
}

export function normalizeProcedureLibrary(payload) {
  const source = payload && typeof payload === "object" ? payload : fallbackProcedureLibrary;
  const procedureTypes = safeArray(source.procedureTypes)
    .map(normalizeProcedureType)
    .filter((item) => item.id);

  return {
    version: Number(source.version || 1),
    reference: String(source.reference || fallbackProcedureLibrary.reference),
    notes: safeArray(source.notes).map((note) => String(note)),
    procedureTypes: procedureTypes.length
      ? procedureTypes
      : fallbackProcedureLibrary.procedureTypes.map(normalizeProcedureType)
  };
}

export function procedureById(library, procedureId) {
  return normalizeProcedureLibrary(library).procedureTypes.find((item) => item.id === procedureId) || null;
}

export function procedureHealingEndsAt(record = {}) {
  return addDays(record.procedureDate || record.createdAt, record.healingDays);
}

export function createProcedureRecord({
  template,
  procedureDate,
  healingDays,
  affectedFields,
  note = "",
  baselineMeasurements = {},
  snapshotCount = 0
} = {}) {
  const normalizedTemplate = normalizeProcedureType(template);
  if (!normalizedTemplate.id) {
    throw new Error("Choose a procedure type.");
  }

  const normalizedDate = normalizeDate(procedureDate);
  const duration = Math.max(
    1,
    Number(healingDays) || normalizedTemplate.defaultHealingDays
  );
  const fields = normalizeFields(affectedFields).length
    ? normalizeFields(affectedFields)
    : normalizedTemplate.affectedFields;

  return {
    schemaVersion: 1,
    templateId: normalizedTemplate.id,
    label: normalizedTemplate.label,
    category: normalizedTemplate.category,
    summary: normalizedTemplate.summary,
    procedureDate: normalizedDate,
    healingDays: duration,
    healingEndsAt: addDays(normalizedDate, duration),
    affectedFields: fields,
    photoCategory: normalizedTemplate.photoCategory,
    riskLevel: normalizedTemplate.riskLevel,
    reviewStatus: normalizedTemplate.reviewStatus,
    requiresHumanReview: normalizedTemplate.requiresHumanReview,
    timeline: normalizedTemplate.timeline,
    caseLogPrompts: normalizedTemplate.caseLogPrompts,
    note: String(note || "").trim(),
    baselineMeasurements,
    startingSnapshotCount: Number(snapshotCount) || 0
  };
}

export function buildProcedureReliabilityCheckIn(record = {}) {
  return {
    type: "life-event",
    source: "procedure-tracker",
    eventMode: "procedure",
    procedureId: record.id || "",
    procedureDate: record.procedureDate || "",
    affectedFields: normalizeFields(record.affectedFields),
    durationDays: Math.max(0, Number(record.healingDays) || 0),
    createdAt: `${normalizeDate(record.procedureDate || record.createdAt)}T12:00:00.000Z`,
    note: [`Procedure log: ${record.label || "Procedure"}.`, record.note]
      .filter(Boolean)
      .join(" ")
  };
}

export function buildProcedureCaseLog(record = {}, snapshots = [], photos = []) {
  const start = dateMs(record.procedureDate || record.createdAt);
  const end = dateMs(procedureHealingEndsAt(record)) + DAY_MS;
  const linkedSnapshots = safeArray(snapshots).filter((snapshot) => {
    const createdAt = new Date(snapshot?.createdAt || 0).getTime();
    return Number.isFinite(createdAt) && createdAt >= start && createdAt <= end;
  });
  const linkedPhotos = safeArray(photos).filter((photo) => {
    const createdAt = new Date(photo?.createdAt || 0).getTime();
    const categoryMatches = !record.photoCategory || photo?.category === record.photoCategory;
    return categoryMatches && Number.isFinite(createdAt) && createdAt >= start && createdAt <= end;
  });
  const fields = normalizeFields(record.affectedFields);
  const summary = `${record.label || "Procedure"}: ${fields.length ? fields.join(", ") : "no fields"} paused for ${Number(record.healingDays) || 0} day(s); ${linkedSnapshots.length} snapshot(s), ${linkedPhotos.length} ${record.photoCategory || "photo"} photo(s).`;

  return {
    procedureId: record.id || "",
    label: record.label || "Procedure",
    category: record.category || "procedure",
    window: `${normalizeDate(record.procedureDate || record.createdAt)} - ${procedureHealingEndsAt(record)}`,
    healingDays: Number(record.healingDays) || 0,
    affectedFields: fields,
    photoCategory: record.photoCategory || "body",
    snapshotCount: linkedSnapshots.length,
    photoCount: linkedPhotos.length,
    reviewStatus: record.reviewStatus || "needs review",
    summary,
    note: record.note || ""
  };
}

export function formatProcedureRecord(record = {}) {
  return `${record.label || "Procedure"} / ${normalizeDate(record.procedureDate || record.createdAt)} / ${Number(record.healingDays) || 0} day window`;
}
