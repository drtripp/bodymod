export const FACE_LANDMARK_MODEL_PATH = "/models/mediapipe/face_landmarker.task";
export const FACE_LANDMARK_WASM_PATH = "/mediapipe/wasm";

const landmarkIndices = {
  forehead: 10,
  browCenter: 168,
  noseTip: 1,
  noseBase: 2,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftIris: 468,
  rightIris: 473,
  mouthLeft: 61,
  mouthRight: 291,
  upperLipTop: 13,
  lipCenter: 0,
  lowerLipBottom: 17,
  lowerLipLine: 14
};

const metricDefinitions = [
  {
    id: "midfaceRatio",
    label: "Midface ratio",
    precision: 2,
    confidence: "medium",
    note: "Eye-center width divided by nasion-to-upper-lip height."
  },
  {
    id: "canthalTiltDeg",
    label: "Canthal tilt",
    precision: 1,
    unit: "deg",
    confidence: "medium",
    note: "Average outer-corner elevation from both eye lines."
  },
  {
    id: "facialThirdsBalance",
    label: "Facial thirds balance",
    precision: 1,
    unit: "%",
    confidence: "low",
    note: "Mean deviation from equal upper, mid, and lower facial thirds."
  },
  {
    id: "eyeSpacingRatio",
    label: "Eye spacing",
    precision: 2,
    confidence: "medium",
    note: "Inner-canthal distance divided by average eye width."
  },
  {
    id: "lipRatio",
    label: "Upper/lower lip",
    precision: 2,
    confidence: "low",
    note: "Upper-lip height divided by lower-lip height."
  },
  {
    id: "philtrumLipRatio",
    label: "Philtrum split",
    precision: 2,
    confidence: "low",
    note: "Nose-base to upper-lip distance divided by lip height."
  },
  {
    id: "fwhRatio",
    label: "fWHR",
    precision: 2,
    confidence: "medium",
    note: "Cheekbone width divided by brow-to-upper-lip height."
  },
  {
    id: "cheekJawRatio",
    label: "Cheekbone/jaw",
    precision: 2,
    confidence: "medium",
    note: "Cheekbone width divided by frontal jaw width."
  },
  {
    id: "faceWidthHeightRatio",
    label: "Face width/height",
    precision: 2,
    confidence: "medium",
    note: "Cheekbone width divided by forehead-to-chin height."
  },
  {
    id: "facialFifthsBalance",
    label: "Facial fifths balance",
    precision: 1,
    unit: "%",
    confidence: "low",
    note: "Mean deviation from equal facial fifth segments."
  }
];

export const sideProfileManualMetricDefinitions = [
  {
    id: "nasolabialAngleDeg",
    label: "Nasolabial angle",
    precision: 1,
    unit: "deg",
    confidence: "manual",
    min: 60,
    max: 140,
    note: "Manual or externally annotated side-profile estimate; not inferred by the frontal face model."
  },
  {
    id: "mentocervicalAngleDeg",
    label: "Mentocervical angle",
    precision: 1,
    unit: "deg",
    confidence: "manual",
    min: 70,
    max: 150,
    note: "Manual neck/chin angle estimate from a side-profile reference."
  },
  {
    id: "facialConvexityDeg",
    label: "Facial convexity",
    precision: 1,
    unit: "deg",
    confidence: "manual",
    min: 120,
    max: 190,
    note: "Manual glabella-subnasale-pogonion style profile angle estimate."
  },
  {
    id: "chinProjectionMm",
    label: "Chin projection",
    precision: 1,
    unit: "mm",
    confidence: "manual",
    min: -30,
    max: 40,
    note: "Manual or calibrated annotation relative to a chosen profile reference line."
  }
];

export const sideProfileResearchNotes = [
  "Nose projection, chin projection, nasolabial angle, and sagittal jaw projection need a true side-profile model or calibrated 3D reconstruction.",
  "Frontal Face Landmarker points can log repeatable relative ratios, but they are not enough for reliable depth or profile measurements.",
  "Manual side-profile logs are collection-only until a licensed browser-local profile model is selected.",
  "Candidate follow-up: browser-local 3D face reconstruction with explicit commercial-license review before shipping."
];

let faceLandmarkerPromise = null;
let currentRunningMode = "IMAGE";

function browserBasePath(path) {
  const baseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${path || ""}`;

  return `${normalizedBase}${normalizedPath}`;
}

export async function loadFaceLandmarker({
  modelPath = FACE_LANDMARK_MODEL_PATH,
  wasmPath = FACE_LANDMARK_WASM_PATH,
  runningMode = "IMAGE"
} = {}) {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = import("@mediapipe/tasks-vision").then(
      async ({ FaceLandmarker, FilesetResolver }) => {
        const vision = await FilesetResolver.forVisionTasks(browserBasePath(wasmPath));
        return FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: browserBasePath(modelPath),
            delegate: "CPU"
          },
          numFaces: 1,
          runningMode,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
      }
    );
    currentRunningMode = runningMode;
  }

  const landmarker = await faceLandmarkerPromise;
  if (runningMode !== currentRunningMode) {
    await landmarker.setOptions({ runningMode });
    currentRunningMode = runningMode;
  }

  return landmarker;
}

function landmark(landmarks, name) {
  const point = landmarks[landmarkIndices[name]];
  if (
    !point ||
    !Number.isFinite(Number(point.x)) ||
    !Number.isFinite(Number(point.y))
  ) {
    throw new Error(`Missing face landmark: ${name}.`);
  }

  return {
    x: Number(point.x),
    y: Number(point.y),
    z: Number(point.z || 0)
  };
}

function optionalLandmark(landmarks, name, fallbackNames) {
  try {
    return landmark(landmarks, name);
  } catch (error) {
    const fallbackPoints = fallbackNames.map((fallbackName) => landmark(landmarks, fallbackName));
    return midpoint(fallbackPoints);
  }
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function verticalDistance(first, second) {
  return Math.abs(first.y - second.y);
}

function midpoint(points) {
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
    z: points.reduce((total, point) => total + point.z, 0) / points.length
  };
}

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function meanAbsoluteDeviation(values, target) {
  return mean(values.map((value) => Math.abs(value - target)));
}

function eyeTiltDeg(outer, inner) {
  return Math.atan2(inner.y - outer.y, Math.abs(inner.x - outer.x)) * (180 / Math.PI);
}

function metric(id, value) {
  const definition = metricDefinitions.find((item) => item.id === id);
  if (!definition || value === null || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Number(value.toFixed(definition.precision));
  return {
    id,
    label: definition.label,
    value: rounded,
    unit: definition.unit || "",
    displayValue: `${rounded.toFixed(definition.precision)}${definition.unit ? ` ${definition.unit}` : ""}`,
    confidence: definition.confidence,
    note: definition.note
  };
}

function manualSideProfileMetric(definition, value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${definition.label} must be numeric.`);
  }

  if (Number.isFinite(definition.min) && numericValue < definition.min) {
    throw new Error(`${definition.label} is below the review range.`);
  }

  if (Number.isFinite(definition.max) && numericValue > definition.max) {
    throw new Error(`${definition.label} is above the review range.`);
  }

  const rounded = Number(numericValue.toFixed(definition.precision));
  return {
    id: definition.id,
    label: definition.label,
    value: rounded,
    unit: definition.unit || "",
    displayValue: `${rounded.toFixed(definition.precision)}${definition.unit ? ` ${definition.unit}` : ""}`,
    confidence: definition.confidence,
    note: definition.note
  };
}

export function deriveFaceMetricsFromLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 468) {
    throw new Error("A full Face Landmarker mesh is required.");
  }

  const forehead = landmark(landmarks, "forehead");
  const browCenter = landmark(landmarks, "browCenter");
  const noseBase = landmark(landmarks, "noseBase");
  const chin = landmark(landmarks, "chin");
  const leftCheek = landmark(landmarks, "leftCheek");
  const rightCheek = landmark(landmarks, "rightCheek");
  const leftJaw = landmark(landmarks, "leftJaw");
  const rightJaw = landmark(landmarks, "rightJaw");
  const leftEyeOuter = landmark(landmarks, "leftEyeOuter");
  const leftEyeInner = landmark(landmarks, "leftEyeInner");
  const rightEyeInner = landmark(landmarks, "rightEyeInner");
  const rightEyeOuter = landmark(landmarks, "rightEyeOuter");
  const leftIris = optionalLandmark(landmarks, "leftIris", ["leftEyeOuter", "leftEyeInner"]);
  const rightIris = optionalLandmark(landmarks, "rightIris", ["rightEyeInner", "rightEyeOuter"]);
  const mouthLeft = landmark(landmarks, "mouthLeft");
  const mouthRight = landmark(landmarks, "mouthRight");
  const upperLipTop = landmark(landmarks, "upperLipTop");
  const lipCenter = landmark(landmarks, "lipCenter");
  const lowerLipBottom = landmark(landmarks, "lowerLipBottom");
  const lowerLipLine = landmark(landmarks, "lowerLipLine");

  const faceHeight = verticalDistance(forehead, chin);
  const cheekboneWidth = distance(leftCheek, rightCheek);
  const jawWidth = distance(leftJaw, rightJaw);
  const browToLipHeight = verticalDistance(browCenter, upperLipTop);
  const eyeCenterWidth = distance(leftIris, rightIris);
  const leftEyeWidth = distance(leftEyeOuter, leftEyeInner);
  const rightEyeWidth = distance(rightEyeOuter, rightEyeInner);
  const eyeSpacing = distance(leftEyeInner, rightEyeInner);
  const upperLipHeight = verticalDistance(upperLipTop, lipCenter);
  const lowerLipHeight = verticalDistance(lipCenter, lowerLipBottom);
  const lipHeight = verticalDistance(upperLipTop, lowerLipLine);
  const mouthWidth = distance(mouthLeft, mouthRight);
  const thirds = [
    verticalDistance(forehead, browCenter),
    verticalDistance(browCenter, noseBase),
    verticalDistance(noseBase, chin)
  ];
  const thirdsTotal = thirds.reduce((total, value) => total + value, 0);
  const thirdsRatios = thirds.map((value) => value / thirdsTotal);
  const fifthSegments = [
    Math.abs(leftCheek.x - leftEyeOuter.x),
    leftEyeWidth,
    eyeSpacing,
    rightEyeWidth,
    Math.abs(rightEyeOuter.x - rightCheek.x)
  ];
  const fifthMean = mean(fifthSegments);

  const metrics = [
    metric("midfaceRatio", ratio(eyeCenterWidth, browToLipHeight)),
    metric("canthalTiltDeg", mean([
      eyeTiltDeg(leftEyeOuter, leftEyeInner),
      eyeTiltDeg(rightEyeOuter, rightEyeInner)
    ])),
    metric("facialThirdsBalance", meanAbsoluteDeviation(thirdsRatios, 1 / 3) * 100),
    metric("eyeSpacingRatio", ratio(eyeSpacing, mean([leftEyeWidth, rightEyeWidth]))),
    metric("lipRatio", ratio(upperLipHeight, lowerLipHeight)),
    metric("philtrumLipRatio", ratio(verticalDistance(noseBase, upperLipTop), lipHeight)),
    metric("fwhRatio", ratio(cheekboneWidth, browToLipHeight)),
    metric("cheekJawRatio", ratio(cheekboneWidth, jawWidth)),
    metric("faceWidthHeightRatio", ratio(cheekboneWidth, faceHeight)),
    metric("facialFifthsBalance", meanAbsoluteDeviation(fifthSegments, fifthMean) / fifthMean * 100)
  ].filter(Boolean);

  return {
    landmarkCount: landmarks.length,
    metrics,
    geometry: {
      faceHeight: Number(faceHeight.toFixed(4)),
      cheekboneWidth: Number(cheekboneWidth.toFixed(4)),
      jawWidth: Number(jawWidth.toFixed(4)),
      mouthWidth: Number(mouthWidth.toFixed(4))
    },
    limitations: sideProfileResearchNotes
  };
}

export function summarizeFaceLandmarkerResult(result, source = "photo") {
  const landmarks = result?.faceLandmarks?.[0] || result?.face_landmarks?.[0];
  if (!landmarks) {
    throw new Error("No face landmarks found.");
  }

  return {
    source,
    measuredAt: new Date().toISOString(),
    ...deriveFaceMetricsFromLandmarks(landmarks)
  };
}

export function buildFaceMeasurementRecord(scan, note = "") {
  if (!scan?.metrics?.length) {
    throw new Error("No face metrics to save.");
  }

  return {
    source: scan.source || "photo",
    measuredAt: scan.measuredAt || new Date().toISOString(),
    landmarkCount: Number(scan.landmarkCount) || 0,
    metrics: scan.metrics.map((item) => ({
      id: item.id,
      label: item.label,
      value: Number(item.value),
      unit: item.unit || "",
      displayValue: item.displayValue,
      confidence: item.confidence,
      note: item.note
    })),
    geometry: scan.geometry || {},
    limitations: scan.limitations || sideProfileResearchNotes,
    note: String(note || "").trim()
  };
}

export function buildSideProfileMeasurementRecord({
  side = "right",
  measuredAt = new Date().toISOString(),
  note = "",
  values = {}
} = {}) {
  const profileSide = ["left", "right", "unspecified"].includes(side)
    ? side
    : "unspecified";
  const metrics = sideProfileManualMetricDefinitions
    .map((definition) => manualSideProfileMetric(definition, values[definition.id]))
    .filter(Boolean);
  const normalizedNote = String(note || "").trim();

  if (!metrics.length && !normalizedNote) {
    throw new Error("Enter at least one side-profile measurement or note.");
  }

  return {
    source: "side-profile-manual",
    orientation: "side-profile",
    side: profileSide,
    measuredAt,
    landmarkCount: 0,
    metrics,
    geometry: {},
    limitations: sideProfileResearchNotes,
    note: normalizedNote
  };
}

export function formatFaceMetricSummary(scan) {
  if (scan?.orientation === "side-profile" || scan?.source === "side-profile-manual") {
    const sideLabel = scan.side && scan.side !== "unspecified" ? ` (${scan.side})` : "";
    if (!scan?.metrics?.length) {
      return `Side profile${sideLabel}: note only`;
    }

    return `Side profile${sideLabel}: ${scan.metrics
      .slice(0, 3)
      .map((item) => `${item.label}: ${item.displayValue}`)
      .join(" / ")}`;
  }

  if (!scan?.metrics?.length) {
    return "No saved face metrics.";
  }

  return scan.metrics
    .slice(0, 4)
    .map((item) => `${item.label}: ${item.displayValue}`)
    .join(" / ");
}
