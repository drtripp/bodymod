import { measurementFields } from "./measurements.js";

const knownFieldNames = new Set(measurementFields.map((field) => field.name));

export const publicMeasurementGuideSlugs = {
  height: "height",
  weight: "weight",
  headCircumference: "head-circumference",
  neckCircumference: "neck-circumference",
  biacromialWidth: "biacromial-width",
  bideltoidWidth: "bideltoid-width",
  bideltoidCircumference: "bideltoid-circumference",
  armpitCircumference: "armpit-circumference",
  nippleCircumference: "nipple-circumference",
  underbustCircumference: "underbust-circumference",
  waistCircumference: "waist-circumference",
  pantWaistCircumference: "pant-waist-circumference",
  hipCircumference: "hip-circumference",
  upperThighCircumference: "upper-thigh-circumference",
  midThighCircumference: "mid-thigh-circumference",
  calfCircumference: "calf-circumference",
  ankleCircumference: "ankle-circumference",
  bicepCircumference: "bicep-circumference",
  upperForearmCircumference: "upper-forearm-circumference",
  wristCircumference: "wrist-circumference"
};

export const emptyMeasurementGuideLibrary = {
  version: 0,
  reference: "",
  notes: [],
  guides: []
};

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export function normalizeMeasurementGuideLibrary(library = {}) {
  const guides = Array.isArray(library.guides)
    ? library.guides
        .map((guide) => ({
          field: String(guide.field || "").trim(),
          label: String(guide.label || "").trim(),
          cadence: String(guide.cadence || "").trim(),
          illustration: String(guide.illustration || "tape").trim(),
          summary: String(guide.summary || "").trim(),
          steps: normalizeStringArray(guide.steps),
          commonMistakes: normalizeStringArray(guide.commonMistakes)
        }))
        .filter((guide) => knownFieldNames.has(guide.field) && guide.label && guide.steps.length)
    : [];

  return {
    version: Number(library.version) || 0,
    reference: String(library.reference || "").trim(),
    notes: normalizeStringArray(library.notes),
    guides
  };
}

export function indexMeasurementGuides(library = emptyMeasurementGuideLibrary) {
  return normalizeMeasurementGuideLibrary(library).guides.reduce((index, guide) => {
    index[guide.field] = guide;
    return index;
  }, {});
}

export function getDefaultMeasurementGuideField(
  library = emptyMeasurementGuideLibrary,
  preferredField = "waistCircumference"
) {
  const guides = normalizeMeasurementGuideLibrary(library).guides;

  if (guides.some((guide) => guide.field === preferredField)) {
    return preferredField;
  }

  return guides[0]?.field || "";
}

export function publicMeasurementGuidePath(field) {
  const slug = publicMeasurementGuideSlugs[field];
  return slug ? `/measurement-guides/${slug}.html` : "/measurement-guides/index.html";
}
