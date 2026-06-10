export const cyclePhaseOptions = [
  {
    id: "menstruation",
    label: "Menstruation",
    context: "Scale and waist noise can run high for some users during bleeding."
  },
  {
    id: "follicular",
    label: "Follicular",
    context: "Often a lower-retention baseline window for comparison."
  },
  {
    id: "ovulation",
    label: "Ovulation",
    context: "Short-term shifts can happen around ovulation for some users."
  },
  {
    id: "luteal",
    label: "Luteal",
    context: "Water retention and appetite shifts can make daily changes noisy."
  },
  {
    id: "unknown",
    label: "Not sure",
    context: "Logs the date without assigning a phase."
  }
];

export const cycleFlowOptions = [
  { id: "not-tracked", label: "Not tracked" },
  { id: "none", label: "None" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "heavy", label: "Heavy" }
];

const noisyPhases = new Set(["menstruation", "luteal", "ovulation"]);

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cyclePhaseMeta(phase) {
  return cyclePhaseOptions.find((option) => option.id === phase) || cyclePhaseOptions[4];
}

export function latestCycleCheckIn(checkIns = []) {
  return checkIns
    .filter((checkIn) => checkIn?.type === "cycle-phase")
    .slice()
    .sort((left, right) => timestampMs(right.createdAt) - timestampMs(left.createdAt))[0] || null;
}

export function buildCycleCheckIn({
  phase = "",
  cycleDay = "",
  flow = "not-tracked",
  symptoms = "",
  note = ""
} = {}) {
  const errors = {};
  const selectedPhase = cyclePhaseOptions.some((option) => option.id === phase)
    ? phase
    : "";
  const selectedFlow = cycleFlowOptions.some((option) => option.id === flow)
    ? flow
    : "not-tracked";
  const parsedCycleDay = numberOrNull(cycleDay);

  if (!selectedPhase) {
    errors.phase = "Choose a cycle phase.";
  }

  if (parsedCycleDay !== null && (parsedCycleDay < 1 || parsedCycleDay > 60)) {
    errors.cycleDay = "Expected day 1-60.";
  }

  if (Object.keys(errors).length) {
    return {
      checkIn: null,
      errors
    };
  }

  return {
    errors,
    checkIn: {
      type: "cycle-phase",
      phase: selectedPhase,
      phaseLabel: cyclePhaseMeta(selectedPhase).label,
      cycleDay: parsedCycleDay,
      flow: selectedFlow,
      symptoms: String(symptoms || "").trim(),
      note: String(note || "").trim(),
      localOnlySensitive: true
    }
  };
}

export function formatCycleCheckIn(checkIn) {
  if (!checkIn) {
    return "";
  }

  const phase = cyclePhaseMeta(checkIn.phase).label;
  const day = Number.isFinite(Number(checkIn.cycleDay))
    ? ` day ${Number(checkIn.cycleDay)}`
    : "";
  const flow = checkIn.flow && checkIn.flow !== "not-tracked"
    ? `, flow ${checkIn.flow}`
    : "";

  return `${phase}${day}${flow}`;
}

export function buildCycleTrendContext(checkIns = [], now = Date.now()) {
  const latest = latestCycleCheckIn(checkIns);
  if (!latest) {
    return {
      status: "off",
      latest: null,
      label: "Cycle context off",
      insight: "Optional cycle tracking is off until a local phase log is saved."
    };
  }

  const ageDays = Math.max(0, Math.floor((timestampMs(now) - timestampMs(latest.createdAt)) / 86400000));
  const meta = cyclePhaseMeta(latest.phase);
  const stale = ageDays > 14;
  const noisy = noisyPhases.has(latest.phase);

  return {
    status: stale ? "stale" : noisy ? "noisy" : "baseline",
    latest,
    ageDays,
    label: `${meta.label}${Number.isFinite(Number(latest.cycleDay)) ? ` day ${Number(latest.cycleDay)}` : ""}`,
    insight: stale
      ? `Cycle context is ${ageDays} days old; log a new phase before using it to interpret weight or waist changes.`
      : noisy
        ? `Cycle context: ${meta.label.toLowerCase()} phase can make short-term weight or waist changes noisy, so treat a single change as water-retention context before calling it fat change.`
        : `Cycle context: ${meta.label.toLowerCase()} phase logged; use this as a comparison window label, not a medical interpretation.`
  };
}
