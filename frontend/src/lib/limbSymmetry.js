import { measurementFields } from "./measurements.js";

export const limbSplitFields = [
  {
    id: "bicepCircumference",
    label: "Bicep",
    leftKey: "bicepLeft",
    rightKey: "bicepRight"
  },
  {
    id: "upperForearmCircumference",
    label: "Forearm",
    leftKey: "forearmLeft",
    rightKey: "forearmRight"
  },
  {
    id: "upperThighCircumference",
    label: "Upper thigh",
    leftKey: "upperThighLeft",
    rightKey: "upperThighRight"
  },
  {
    id: "calfCircumference",
    label: "Calf",
    leftKey: "calfLeft",
    rightKey: "calfRight"
  }
];

const fieldBounds = new Map(
  measurementFields.map((field) => [
    field.name,
    {
      min: field.min,
      max: field.max,
      unit: field.unit || ""
    }
  ])
);

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function validateSide(value, field, sideKey, errors) {
  if (value === null) {
    errors[sideKey] = "Enter a number";
    return false;
  }

  const bounds = fieldBounds.get(field.id);
  if (bounds && (value < bounds.min || value > bounds.max)) {
    errors[sideKey] = `Expected ${bounds.min}-${bounds.max} ${bounds.unit}`;
    return false;
  }

  return true;
}

export function parseLimbSymmetryInput(values = {}) {
  const errors = {};
  const splits = [];
  let hasInput = false;

  for (const field of limbSplitFields) {
    const left = optionalNumber(values[field.leftKey]);
    const right = optionalNumber(values[field.rightKey]);

    if (left === null && right === null) {
      continue;
    }

    hasInput = true;
    const hasValidLeft = validateSide(left, field, field.leftKey, errors);
    const hasValidRight = validateSide(right, field, field.rightKey, errors);

    if (!hasValidLeft || !hasValidRight) {
      continue;
    }

    const average = (left + right) / 2;
    splits.push({
      field: field.id,
      label: field.label,
      left,
      right,
      average: Number(average.toFixed(1)),
      unit: fieldBounds.get(field.id)?.unit || "cm"
    });
  }

  if (!hasInput) {
    errors.form = "Enter at least one left/right pair.";
  }

  return {
    splits,
    errors,
    isValid: !Object.keys(errors).length
  };
}

export function summarizeLimbSymmetrySplits(splits = []) {
  const items = splits
    .filter((split) => Number.isFinite(Number(split.left)) && Number.isFinite(Number(split.right)))
    .map((split) => {
      const left = Number(split.left);
      const right = Number(split.right);
      const average = Number.isFinite(Number(split.average))
        ? Number(split.average)
        : (left + right) / 2;
      const signedDelta = Number((right - left).toFixed(1));
      const absoluteDelta = Number(Math.abs(signedDelta).toFixed(1));
      const percentDelta = average
        ? Number(((absoluteDelta / average) * 100).toFixed(1))
        : 0;
      const dominantSide =
        absoluteDelta < 0.25 ? "even" : signedDelta > 0 ? "right" : "left";

      return {
        ...split,
        average: Number(average.toFixed(1)),
        signedDelta,
        absoluteDelta,
        percentDelta,
        dominantSide
      };
    });

  const largest = items
    .slice()
    .sort((left, right) => right.absoluteDelta - left.absoluteDelta)[0] || null;
  const averagePercentDelta = items.length
    ? Number(
        (
          items.reduce((total, item) => total + item.percentDelta, 0) / items.length
        ).toFixed(1)
      )
    : 0;

  return {
    items,
    largest,
    averagePercentDelta,
    status:
      largest && largest.percentDelta >= 5
        ? "watch"
        : items.length
          ? "balanced"
          : "empty"
  };
}

export function formatLimbSymmetryItem(item) {
  if (!item) {
    return "";
  }

  if (item.dominantSide === "even") {
    return `${item.label} even (${item.absoluteDelta.toFixed(1)} cm)`;
  }

  return `${item.label} ${item.dominantSide} +${item.absoluteDelta.toFixed(1)} cm (${item.percentDelta.toFixed(1)}%)`;
}

export function buildLimbSymmetryCheckIn(values = {}, note = "") {
  const parsed = parseLimbSymmetryInput(values);

  if (!parsed.isValid) {
    return {
      checkIn: null,
      ...parsed
    };
  }

  return {
    ...parsed,
    checkIn: {
      type: "limb-symmetry",
      splits: parsed.splits,
      measurements: Object.fromEntries(
        parsed.splits.map((split) => [split.field, split.average])
      ),
      note: String(note || "").trim()
    }
  };
}

export function latestLimbSymmetryCheckIn(checkIns = []) {
  return checkIns
    .filter((checkIn) => checkIn?.type === "limb-symmetry" && Array.isArray(checkIn.splits))
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null;
}
