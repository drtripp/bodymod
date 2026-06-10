export const targetBuildOptions = [
  { id: "lean", label: "Lean" },
  { id: "muscular", label: "Muscular" },
  { id: "curvy", label: "Curvy" },
  { id: "balanced", label: "Balanced" }
];

export const defaultTargetFilters = {
  source: "all",
  sex: "all",
  build: "all"
};

function normalizeSourceLabel(source) {
  return String(source || "target")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function targetBuildProfile(target) {
  const measurements = target?.measurements || {};
  const heightMeters = Number(measurements.height) / 100;
  const weight = Number(measurements.weight);
  const waist = Number(measurements.waistCircumference);
  const hip = Number(measurements.hipCircumference);
  const shoulderMass = Number(measurements.bideltoidCircumference);
  const sex = measurements.sex;
  const bmi =
    Number.isFinite(heightMeters) && heightMeters > 0 && Number.isFinite(weight)
      ? weight / (heightMeters * heightMeters)
      : null;
  const waistToHeight =
    Number.isFinite(waist) && Number.isFinite(measurements.height)
      ? waist / Number(measurements.height)
      : null;
  const hipWaistDelta =
    Number.isFinite(hip) && Number.isFinite(waist) ? hip - waist : null;

  if (
    Number.isFinite(shoulderMass) &&
    (shoulderMass >= 122 || (Number.isFinite(bmi) && bmi >= 26 && shoulderMass >= 112))
  ) {
    return { id: "muscular", label: "Muscular" };
  }

  if (
    sex === "female" &&
    Number.isFinite(hipWaistDelta) &&
    hipWaistDelta >= 26
  ) {
    return { id: "curvy", label: "Curvy" };
  }

  if (
    Number.isFinite(bmi) &&
    bmi < 22.5 &&
    Number.isFinite(waistToHeight) &&
    waistToHeight < 0.46
  ) {
    return { id: "lean", label: "Lean" };
  }

  return { id: "balanced", label: "Balanced" };
}

export function buildTargetFilterOptions(targets = []) {
  const sources = new Map();
  const sexes = new Set();
  const builds = new Set();

  targets.forEach((target) => {
    if (target?.source_type) {
      sources.set(target.source_type, normalizeSourceLabel(target.source_type));
    }

    if (target?.measurements?.sex) {
      sexes.add(target.measurements.sex);
    }

    builds.add(targetBuildProfile(target).id);
  });

  return {
    sources: [...sources.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    sexes: [...sexes].sort().map((id) => ({
      id,
      label: id === "female" ? "Female" : "Male"
    })),
    builds: targetBuildOptions.filter((option) => builds.has(option.id))
  };
}

export function filterTargets(targets = [], filters = defaultTargetFilters) {
  const activeFilters = {
    ...defaultTargetFilters,
    ...filters
  };

  return targets.filter((target) => {
    if (activeFilters.source !== "all" && target.source_type !== activeFilters.source) {
      return false;
    }

    if (activeFilters.sex !== "all" && target.measurements?.sex !== activeFilters.sex) {
      return false;
    }

    if (activeFilters.build !== "all" && targetBuildProfile(target).id !== activeFilters.build) {
      return false;
    }

    return true;
  });
}
