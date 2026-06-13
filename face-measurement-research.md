# Local Face Measurement Research

Status: frontend v1 implemented for frontal browser-local landmark metrics.

## TroonTraits reference

The referenced TroonTraits face page presents a browser-only face scan with
camera and upload modes, local privacy copy, and a midface-ratio measurement.
That makes the useful product pattern clear: local landmark collection and
dated metric logging, not copying source code or uploading images.

## Chosen implementation

- Package: `@mediapipe/tasks-vision`.
- Runtime assets: self-hosted under `frontend/public/mediapipe/wasm`.
- Model asset: self-hosted under
  `frontend/public/models/mediapipe/face_landmarker.task`.
- Runtime modes: uploaded photos use IMAGE mode; camera scans use VIDEO mode.
- Storage: saved records keep derived metrics, source, note, timestamp, and
  landmark count. They do not store the analyzed image.

Google's Face Landmarker web guide documents the NPM package, local model path
setup, IMAGE/VIDEO running modes, synchronous `detect`/`detectForVideo` calls,
and the output shape. The task overview says the bundle outputs 478
three-dimensional landmarks plus optional blendshapes and transformation
matrices.

## Shipped frontal metrics

The v1 metric set is a repeatable relative measurement log, not diagnosis or
identity inference:

- Midface ratio
- Canthal tilt
- Facial thirds balance
- Eye spacing ratio
- Upper/lower lip ratio
- Philtrum split
- fWHR
- Cheekbone-to-jaw ratio
- Face width/height ratio
- Facial fifths balance

Every metric is labeled with low or medium confidence because camera lens,
pose, expression, crop, and lighting change the derived ratios.

## Side-profile collection fallback

The account panel now supports a manual side-profile log for nasolabial angle,
mentocervical angle, facial convexity, chin projection, and note-only entries.
Those records share the same local face-measurement storage/export/backup/report
path as frontal scans and do not store side-profile photos.

## Side-profile model spike

Frontal Face Landmarker points are not sufficient for reliable sagittal
measurements. The app should not claim nose projection, chin projection,
nasolabial angle, or jaw projection from a frontal mesh alone.

Candidate follow-up paths:

- A profile-specific landmark detector that is licensed for commercial web
  use and can run in-browser.
- A browser-local 3D face reconstruction model with explicit license review,
  size/performance testing, and a calibration story.
- Upgrade the current manual side-profile annotation/logging flow if local ML
  quality or licensing is not acceptable.

Production gate: do not ship automatic side-profile numerical outputs until the
selected model has permissive commercial terms, repeatability testing, and
user-facing uncertainty copy.

## Sources

- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- https://troontraits.web.app/face
