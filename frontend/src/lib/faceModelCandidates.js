export const fallbackFaceModelCandidateLibrary = {
  version: 1,
  source: "Face model candidate metadata unavailable.",
  notes: [
    "Backend face model candidate metadata did not load. Keep automatic side-profile inference blocked until model/license review is complete."
  ],
  candidates: [
    {
      id: "face-model-candidates-unavailable",
      label: "Face model candidates unavailable",
      sourceType: "research-candidate",
      sourceUrl: "",
      orientationSupport: ["side-profile"],
      inputModes: ["manual-entry"],
      localRuntime: true,
      prototypeSafe: true,
      reviewStatus: "needs review",
      imageStoragePolicy: "Fallback only; do not enable image analysis from this metadata.",
      measurementOutputs: ["manual side-profile note"],
      privacyRequirements: ["Keep side-profile logs manual until model metadata reloads."],
      limitations: ["Candidate library failed to load."],
      nextValidationSteps: ["Reload backend face model candidates before launch review."]
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCandidate(candidate = {}) {
  return {
    id: String(candidate.id || ""),
    label: String(candidate.label || candidate.id || "Face model candidate"),
    sourceType: String(candidate.sourceType || "research-candidate"),
    sourceUrl: String(candidate.sourceUrl || ""),
    orientationSupport: safeArray(candidate.orientationSupport).map(String),
    inputModes: safeArray(candidate.inputModes).map(String),
    localRuntime: Boolean(candidate.localRuntime),
    prototypeSafe: Boolean(candidate.prototypeSafe),
    reviewStatus: String(candidate.reviewStatus || "needs review"),
    imageStoragePolicy: String(candidate.imageStoragePolicy || ""),
    measurementOutputs: safeArray(candidate.measurementOutputs).map(String),
    privacyRequirements: safeArray(candidate.privacyRequirements).map(String),
    limitations: safeArray(candidate.limitations).map(String),
    nextValidationSteps: safeArray(candidate.nextValidationSteps).map(String)
  };
}

export function normalizeFaceModelCandidateLibrary(payload = {}) {
  const candidates = safeArray(payload.candidates)
    .filter((candidate) => candidate?.id)
    .map(normalizeCandidate);

  return {
    version: Number(payload.version || fallbackFaceModelCandidateLibrary.version),
    source: String(payload.source || fallbackFaceModelCandidateLibrary.source),
    notes: safeArray(payload.notes).map(String),
    candidates: candidates.length ? candidates : fallbackFaceModelCandidateLibrary.candidates
  };
}

export function faceModelCandidateSummary(library = fallbackFaceModelCandidateLibrary) {
  const normalized = normalizeFaceModelCandidateLibrary(library);
  const localRuntimeCount = normalized.candidates.filter(
    (candidate) => candidate.localRuntime
  ).length;
  const sideProfileCount = normalized.candidates.filter((candidate) =>
    candidate.orientationSupport.includes("side-profile")
  ).length;
  const prototypeSafeCount = normalized.candidates.filter(
    (candidate) => candidate.prototypeSafe
  ).length;
  const blockedAutomaticSideProfileCount = normalized.candidates.filter(
    (candidate) =>
      candidate.orientationSupport.includes("side-profile") &&
      !candidate.prototypeSafe
  ).length;

  return {
    totalCount: normalized.candidates.length,
    localRuntimeCount,
    sideProfileCount,
    prototypeSafeCount,
    blockedAutomaticSideProfileCount,
    readyForAutomaticSideProfile: blockedAutomaticSideProfileCount === 0
  };
}
