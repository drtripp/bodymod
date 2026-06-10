# bodymod

Measurement-driven body comparison and local tracking tool.

The current app is a small full-stack prototype:

- `frontend/`: React + Vite frontend in JavaScript
- `backend/`: FastAPI backend in Python
- root docs: current product/spec notes and longer-term planning

## Stack

- Frontend: React 18, Vite, plain CSS
- Backend: FastAPI, Uvicorn, Pydantic, SQLite
- Storage: adapter-backed browser `localStorage` for local snapshots and account data
- Rendering: deterministic SVG silhouette generated from measurements

The app is measurement-first. It does not accept photos, does not provide medical or procedural guidance, and does not include accounts.

## Run

## Verify

Run the full local verification suite from the repo root:

```powershell
.\verify.ps1
```

This runs backend pytest, corpus validation tests, frontend build, Playwright
user-flow tests, screenshot capture, and Playwright output cleanup.
GitHub Actions runs the same verifier on push and pull requests via
`.github/workflows/verify.yml`.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000` by default.
Target profiles are seeded from `backend/app/data/targets.seed.json` into a
local SQLite database. Set `BODYMOD_DB_PATH` to override the default runtime DB
path (`backend/.local/bodymod.sqlite3`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

Set `VITE_API_BASE_URL` if the backend is not running on `http://localhost:8000`.

Deployment notes are in `deployment.md`. For a hosted frontend, set
`BODYMOD_CORS_ORIGINS` on the backend to the public frontend origin.

## Current Scope

Implemented now:

- single-page tool layout
- expanded measurement form with metric/imperial display controls
- per-field measurement help text
- inline validation in frontend and backend
- deterministic front-view SVG silhouette
- hover-linked measurement anchors between form and silhouette
- FastAPI health, target-list, and match endpoints
- curated placeholder and archetype target profiles served through a SQLite repository
- height-normalized and ratio-aware match scoring with explanation bullets
- approximate adult-reference percentile output
- simplified result pane with large top-match name and placeholder similarity score
- runner-up match shown directly under the top match
- 2x3 metric block grid for height, BMI, estimated body fat, SHR, WHR, and SWR
- local snapshot save, label, note, load, compare, export, import, and delete in browser storage
- shared frontend storage adapter for current web storage and future native storage
- local snapshot trend summary across saved entries
- compact local trend chart for key saved-snapshot metrics
- per-field noise bands on snapshot trend charts using the documented re-measurement error model
- per-metric snapshot history charts with range filters and note annotations
- local account workspace for persona walkthroughs, goals, protocols, check-ins, workouts, photos, and reports
- daily weight trend smoothing with raw-dot vs smoothed-line display
- historical weight CSV import for local daily logs, with lb/kg handling, optional calories, and duplicate-date skipping
- passphrase-encrypted local backup and restore for snapshots and account logs, with photo metadata manifest only
- adaptive TDEE estimate from reliable daily weight and calorie logs, with reliability-window exclusions
- guided weekly check-in flow with snapshot save, streak/grace state, heatmap, milestones, insight drops, and weekly digest
- maintenance drift alerts for saved goals once an at-target snapshot exists
- protocol tracker with backend-seeded taxonomy, local create/edit/archive, adherence scoring, outcome attribution, case logs, plan retros, and reliability/life-event annotations
- reliability events pause affected weight and tape trend inference during healing or disruption windows
- projected silhouettes for calorie-target protocol planning bands, with uncertainty copy
- local goals can target preset deltas, custom deltas, target profiles, or saved past-self snapshots
- local browser face measurement logger using self-hosted MediaPipe assets for camera/photo landmark scans
- local progress photo streams for body, face, and hair with ghost overlay and comparison slider
- current-vs-selected-snapshot silhouette comparison
- side-by-side and overlap comparison modes
- animated current-to-target morph mode with an SVG morph share-card download
- current-vs-target measurement difference table in the comparison panel
- overlap-mode measurement-band diff for current-vs-target region gaps
- saved snapshots usable as local "past self" comparison and goal targets
- vs Target filters for source type, sex, and inferred build category
- target type, placeholder notes, and largest score-driver bullets in the vs Target pane
- result, vs Target, and vs US Population panes are presented as tabs
- first-draft US population scatter and distribution plots with sex-colored reference bands
- Body/Diet top-level switcher
- Diet tracker with Open Food Facts search, barcode lookup, optional browser barcode scanner, local food log, macro totals, and micronutrient totals
- method/privacy content collapsed into a hover footnote
- header share icon that copies an encoded measurement URL without showing a share panel
- local-only lightweight usage event logging
- privacy control to inspect and clear local usage events
- outcome-first strategy explorer with one efficacy/risk graph per desired outcome
- strategy explorer opens as an overlay from the main header action
- clickable strategy dots with synopsis modal and dedicated strategy detail view
- strategy corpus JSON export/import with validation for manually curated entries
- imported strategy corpus persists locally with a reset-to-seed control
- imported corpus source links render in strategy entries
- corpus entries display safety flags, legal notes, cost, and personalization exclusion status
- importable corpus template in `strategy-corpus-template.json`
- Node corpus validation tests for import/export normalization and rejected evidence levels
- Playwright desktop and phone-viewport frontend user-flow tests
- pytest backend API/service tests
- backend schema-drift test for frontend/backend measurement fields
- backend target-data and SQLite repository tests for IDs, schemas, and placeholder uncertainty notes
- target profile template and curation guide for future production target data
- graceful no-backend state for local form and snapshots
- offline comparison copy that keeps target comparison separate from local snapshot comparison
- minimal dark visual system using plain CSS

Not implemented yet:

- real percentile calculations from a vetted reference population
- vetted ANSUR, NHANES, or equivalent data behind the population charts
- production-quality target dataset
- server-side accounts, encrypted sync, or cross-device history
- hosted photo/body inference work; current face scans are browser-local only
- first-party food database ownership; Diet currently depends on Open Food Facts and local browser storage

## Current Measurement Schema

The app no longer uses the original seven-field MVP schema. The current schema is expanded and mirrored between `frontend/src/lib/measurements.js` and `backend/app/models.py`:

- height
- weight
- sex
- head circumference
- neck circumference
- biacromial width
- bideltoid width
- bideltoid circumference
- armpit circumference
- nipple circumference
- underbust circumference
- waist circumference
- pant waist circumference
- hip/buttock circumference
- upper thigh circumference
- mid thigh circumference
- calf circumference
- bicep circumference
- upper forearm circumference
- wrist circumference
- ankle circumference

## Future Features

The planned next work is documented in `mvp-build-spec.md` and `site-implementation-plan.md`. In short:

- replace approximate percentiles with vetted reference-population calculations
- expand and clean up the target library
- replace the seed strategy corpus with a manually sourced corpus
- continue mobile polish from Playwright coverage and manual screenshots
- decide whether production analytics are acceptable

Longer-term ideas are captured in `body-modding-platform-plan.md`.
Launch privacy and moderation gates are captured in `launch-decision-record.md`.
Remaining non-code inputs are tracked in `manual-work-queue.md`.

## Model Notes

- `facebook/sapiens2` was evaluated on April 24, 2026 as a possible future photo/body-analysis model.
- It is not a fit for the current app direction. The present product is measurement-first, and raw photo uploads are out of scope.
- Even for a future photo-assisted flow, Sapiens2 appears misaligned: its published checkpoints are for pose estimation, body-part segmentation, surface normals, and pointmaps rather than direct measurement extraction.
- More importantly, the Sapiens2 license explicitly restricts use "for biometric processing", which makes it a poor candidate for a body-measurement product without separate legal review and a narrower use case.

## Docs

- `README.md`: current repo overview and run instructions
- `completion-audit.md`: prompt-to-artifact audit of the active build goal
- `verify.ps1`: full local verification wrapper
- `launch-decision-record.md`: public-launch privacy, sharing, analytics, and moderation gates
- `protocol-planning-notes.md`: protocol tracker schema, projection caveats, and NIDDK/Hall references
- `face-measurement-research.md`: local face landmark implementation and side-profile spike notes
- `manual-work-queue.md`: remaining manual content, data, and approval inputs
- `mvp-build-spec.md`: current build spec and near-term backlog
- `site-implementation-plan.md`: implementation status and next engineering phases
- `body-modding-platform-plan.md`: broader product roadmap and non-MVP ideas
- `body-modding-platform-plan.docx`: original archival planning document
- `deployment.md`: prototype deployment notes and launch caveats
- `reference-data-curation.md`: replacement standard for production percentile data
- `similarity-score-spec.md`: calibrated 0-100 similarity score mapping and implementation plan
- `product-strategy-notes.md`: feature roadmap, engagement mechanics, onboarding, demographics, iOS packaging, and monetization notes
- `feature-backlog.md`: full build-out to-do list across all workstreams, with human-gated items tagged
- `attractiveness-evidence-base.md`: cited peer-reviewed evidence for attractiveness-correlate goal presets, with ship/don't-ship verdicts per metric
- `review-screenshots/README.md`: screenshot capture and manual visual-review notes
- `strategy-corpus-template.json`: starter JSON shape for manually sourced corpus entries
- `strategy-corpus-curation.md`: manual review rubric for corpus entries
- `target-profiles-template.json`: starter JSON shape for curated target profiles
- `target-profile-curation.md`: manual review rubric for target profile data
