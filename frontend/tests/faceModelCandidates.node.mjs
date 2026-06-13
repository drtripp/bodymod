import assert from "node:assert/strict";
import test from "node:test";

import {
  faceModelCandidateSummary,
  fallbackFaceModelCandidateLibrary,
  normalizeFaceModelCandidateLibrary
} from "../src/lib/faceModelCandidates.js";

test("normalizes face model candidates and counts side-profile gates", () => {
  const library = normalizeFaceModelCandidateLibrary({
    version: 2,
    source: "Face model seed.",
    notes: ["No images."],
    candidates: [
      {
        id: "troontraits-reference",
        label: "TroonTraits local face scan pattern",
        sourceType: "reference-app",
        sourceUrl: "https://troontraits.web.app/face",
        orientationSupport: ["frontal"],
        inputModes: ["live-camera", "upload-photo"],
        localRuntime: true,
        prototypeSafe: false,
        reviewStatus: "needs source-code and license review",
        imageStoragePolicy: "No image approval.",
        measurementOutputs: ["midface ratio"],
        privacyRequirements: ["No upload."],
        limitations: ["Reference only."],
        nextValidationSteps: ["Review license."]
      },
      {
        id: "manual-side-profile-log",
        label: "Manual side-profile log",
        orientationSupport: ["side-profile"],
        inputModes: ["manual-entry"],
        localRuntime: true,
        prototypeSafe: true,
        reviewStatus: "implemented as collection fallback; production copy needs review",
        measurementOutputs: ["note-only profile log"]
      },
      {
        id: "browser-local-3d-face-reconstruction",
        label: "Browser-local 3D face reconstruction",
        orientationSupport: ["frontal", "side-profile", "3d"],
        inputModes: ["multi-view-photo"],
        localRuntime: true,
        prototypeSafe: false,
        reviewStatus: "needs model review"
      }
    ]
  });
  const summary = faceModelCandidateSummary(library);

  assert.equal(library.version, 2);
  assert.equal(library.candidates[0].sourceUrl, "https://troontraits.web.app/face");
  assert.equal(library.candidates[1].sourceType, "research-candidate");
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.localRuntimeCount, 3);
  assert.equal(summary.sideProfileCount, 2);
  assert.equal(summary.prototypeSafeCount, 1);
  assert.equal(summary.blockedAutomaticSideProfileCount, 1);
  assert.equal(summary.readyForAutomaticSideProfile, false);
});

test("falls back to a manual side-profile gate when payload is empty", () => {
  const library = normalizeFaceModelCandidateLibrary({});
  const summary = faceModelCandidateSummary(library);

  assert.equal(library.source, fallbackFaceModelCandidateLibrary.source);
  assert.equal(library.candidates[0].id, "face-model-candidates-unavailable");
  assert.equal(summary.sideProfileCount, 1);
  assert.equal(summary.prototypeSafeCount, 1);
});
