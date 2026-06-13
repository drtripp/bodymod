# bodymod

Measurement-driven body comparison and local tracking tool.

The current app is a small full-stack prototype:

- `frontend/`: React + Vite frontend in JavaScript
- `backend/`: FastAPI backend in Python
- root docs: current product/spec notes and longer-term planning

## Stack

- Frontend: React 18, Vite, plain CSS
- Backend: FastAPI, Uvicorn, Pydantic, SQLite
- Storage: adapter-backed browser `localStorage` for web plus Capacitor
  Preferences and Filesystem storage in native runtimes
- Rendering: deterministic SVG silhouette generated from measurements

The app is measurement-first. It does not provide medical or procedural guidance. Accounts are still browser-local by default; production server-side identity and sync are not enabled.

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
`/api/match` is protected by a configurable in-process rate limit; production
deployments should still enforce shared edge limits when using multiple workers.

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
The backend default CORS list also includes `capacitor://localhost` for the
native shell bootstrap.

### Native Shell

Capacitor config and scripts live in `frontend/`. After native toolchains are
available, run `npm run native:add:android` or `npm run native:add:ios`, then
`npm run native:sync` after web changes. Native runtimes use the same storage
adapter with a Capacitor Preferences cache and one-time migration from existing
`bodymod:` webview `localStorage` keys. Progress-photo bytes are stored through
Capacitor Filesystem while account JSON keeps only photo metadata. Set
`VITE_API_BASE_URL` before syncing when testing on a device or emulator. See
`frontend/native-readme.md`.

## Current Scope

Implemented now:

- single-page tool layout
- warm cafe theme by default with a persisted graphite theme toggle
- expanded measurement form with metric/imperial display controls
- per-field measurement help text
- inline validation in frontend and backend
- deterministic front-view SVG silhouette with themed line-art styling
- deterministic side-view SVG silhouette estimated from circumference vs width, with the same themed line-art treatment
- hover-linked measurement anchors between form and silhouette
- FastAPI health, target-list, and match endpoints
- curated placeholder and archetype target profiles served through a SQLite repository
- height-normalized and ratio-aware match scoring with explanation bullets
- configurable match-priority presets for balanced, shoulders, and waist/hip scoring
- backend-served mixed reference distributions: NHANES August 2021-August 2023 adult height, weight, waist, and hip overlays plus dummy scaffold fields for unsupported measurements
- ANSUR-style reference importer scaffold that maps a locally reviewed CSV into review-gated sex-specific percentile overlay JSON
- schema-wide approximate percentile output with field-level source labels and legacy height/waist/shoulder keys preserved
- simplified result pane with large top-match name and bounded similarity score
- runner-up match shown directly under the top match
- 2x3 metric block grid for height, BMI, estimated body fat, SHR, WHR, and SWR
- local snapshot save, label, note, load, compare, export, import, and delete in browser storage
- shared frontend storage adapter for web storage, native Capacitor Preferences, and tests
- local snapshot trend summary across saved entries
- compact local trend chart for key saved-snapshot metrics
- per-field noise bands on snapshot trend charts using the documented re-measurement error model
- per-metric snapshot history charts with range filters and note annotations
- local account workspace for persona walkthroughs, goals, protocols, check-ins, workouts, photos, and reports
- local multi-profile switcher for browser-local accounts, with separate account-scoped logs and per-profile counts
- backend email magic-link identity scaffold with one-time link requests,
  hash-stored tokens/sessions, dev-token mode for local verification, and an
  optional SMTP delivery path that emails clickable `magicLinkToken` URLs
  without returning the login token in JSON; the account-panel preview does
  not send measurements or logs
- backend-served planning seed file with 10 validation personas, goal presets, protocol templates, and reference checks
- backend-served attractiveness evidence seed scaffold mapping reviewed/contested claims to goal presets for validation
- daily weight trend smoothing with raw-dot vs smoothed-line display
- historical weight CSV import for local daily logs, with lb/kg handling, optional calories, and duplicate-date skipping
- optional left/right bicep, forearm, thigh, and calf split logs with local symmetry summaries
- passphrase-encrypted local backup and restore for snapshots and account logs, including procedure and local-only bloodwork records, with photo metadata manifest only
- native encrypted-backup file scaffold that saves/restores/deletes the same AES-GCM backup through Capacitor Filesystem in installed apps, with session autosave controls
- backend encrypted sync-vault scaffold that stores only opaque AES-GCM backup blobs, hashed sync tokens, device IDs, and revision metadata, plus account-panel create/push/pull/merge/force-push/revoke UI and tests that keep plaintext measurements out of request bodies
- opt-in automatic encrypted sync preview that reuses the browser-held sync vault token and in-memory backup passphrase to run client-side merge-and-push checks without sending plaintext logs to the server
- token-scoped personal data API scaffold that issues read-only bearer tokens for the encrypted sync vault, stores only token hashes, and lets account-panel users issue/test/revoke access without exposing plaintext measurements
- adaptive TDEE estimate from reliable daily weight and calorie logs, with reliability-window exclusions
- guided weekly check-in flow with snapshot save, streak/grace state, heatmap, milestones, insight drops, and weekly digest
- first Snapshot #1 save requests browser notification permission, stores the local preference, and stale-trend reminders use data-decay copy with service-worker delivery when available
- optional remote web-push subscription scaffold with backend VAPID config, strict subscription storage, account-panel enable/disable control, and a dry-runable scheduled stale-trend delivery worker
- native Capacitor push-token registration/revocation scaffold for stale-trend reminders, plus native haptic feedback after successful check-in saves
- dry-runable native stale-trend reminder worker with FCM/APNs sender hooks that use the same generic, measurement-free notification copy
- native shell polish with Capacitor status-bar/splash configuration, safe-area-aware app padding, and a shared web manifest/SVG app icon
- native home-screen widget payload scaffold that keeps a measurement-free streak and next-check-in snapshot ready in local/native storage
- native HealthKit/Health Connect write-batch preview that prepares local weights, measurements, workouts, nutrition days, and fluid days while persisting only metadata
- backend live-update manifest seed and account-panel update status check for web/native version drift, with metadata-only local storage
- backend launch-readiness gate seed and account-panel checklist that mirrors
  the manual work queue into machine-validated blockers before completion or
  production launch
- maintenance drift alerts for saved goals once an at-target snapshot exists
- optional local cycle phase logs that add weight/waist fluctuation context, remain off by default, and can be deleted separately
- protocol tracker with backend-seeded taxonomy, local create/edit/archive, adherence scoring, outcome attribution, case logs, plan retros, and reliability/life-event annotations
- review-only user case-log submission queue: generated protocol case logs can
  be submitted to `/api/case-log-submissions` for future moderation without
  account IDs, private notes, photos, or raw measurement fields; nothing is
  published into the corpus until policy/reviewer decisions exist
- procedure tracker with backend dummy procedure taxonomy, local surgery/filler/piercing/tattoo/body-mod logs, healing windows, photo stream hints, generated reliability events, and case-log output
- local-only bloodwork log with backend dummy marker/range seed, manual lab-result entry, trend sparklines, protocol links, readable export/backup/report inclusion, and share-dashboard exclusion
- reliability events pause affected weight and tape trend inference during healing or disruption windows, and pause saved goals whose target metrics are affected
- projected silhouettes for calorie-target protocol planning bands, with uncertainty copy and the documented Hall 2011 linearized long-term body-weight equation
- local goals can target preset deltas, custom deltas, target profiles, or saved past-self snapshots, with distance-to-target progress copy
- readable local JSON export for snapshots and diet data without an account, plus account-scoped logs when signed in
- opt-in server-side read-only share dashboards with opaque public links and browser-held revoke tokens
- local browser face measurement logger using self-hosted MediaPipe assets for camera/photo landmark scans, plus manual side-profile measurement logs while profile-specific ML remains under review
- local progress photo streams for body, face, and hair with ghost overlay and comparison slider
- Capacitor Filesystem-backed native progress-photo asset storage, keeping photo bytes out of Preferences/account metadata while preserving local-only web photo behavior
- current-vs-selected-snapshot silhouette comparison
- side-by-side and overlap comparison modes
- animated current-to-target morph mode with an SVG morph share-card download
- reusable 10-profile silhouette QA fixture set covering compact, broad, curvy, lean, high-BMI, lower-body, upper-body, return-to-form, and transition-tracking shapes
- current-vs-target measurement difference table in the comparison panel
- overlap-mode measurement-band diff for current-vs-target region gaps
- saved snapshots usable as local "past self" comparison and goal targets
- vs Target filters for source type, sex, and inferred build category
- target type, placeholder notes, and largest score-driver bullets in the vs Target pane
- result, vs Target, and vs US Population panes are presented as tabs
- first-draft US population scatter and distribution plots with sex-colored reference bands
- population charts load the backend mixed NHANES/scaffold reference model when available and fall back locally when offline
- Body/Diet top-level switcher
- Diet tracker with backend USDA-style generic food search, Open Food Facts
  search, barcode lookup, optional browser barcode scanner, native ML Kit
  barcode scanner in Capacitor runtimes, CSV import, local food log, macro
  targets, and expanded micronutrient target rows
- backend USDA-style food seed file with dummy FDC provenance, search keywords, and nutrient validation
- offline FoodData Central import scaffold for locally reviewed JSON/CSV exports,
  with candidate-file validation before any production seed replacement
- public marketing page at `/landing.html` with current app screenshots, privacy stance, planned store links, and local Pro waitlist capture
- method/privacy content collapsed into a hover footnote
- header share icon that copies an encoded measurement URL without showing a share panel
- local-only lightweight usage event logging
- backend measurement-guide seed file with reviewable copy for every measurable schema field
- privacy control to inspect and clear local usage events
- privacy-preserving browser error event ring plus optional opt-in backend
  upload to `/api/client-errors`; reports contain fingerprints and source
  metadata, not raw messages, stacks, measurements, or form payloads
- privacy-first product analytics wiring with a local ring buffer, sanitized
  first-party `/api/product-analytics` sink, allowlisted event names, no
  arbitrary properties, and disabled-by-default upload pending a provider
  decision
- accessibility baseline with skip-to-main navigation, visible focus rings, live status messages, form error associations, and chart descriptions
- backend-served free/pro entitlement config, with all current tracking/data/export tools free
- local-only Pro waitlist capture and blurred Pro preview cards in the account panel
- local-only honest referral scaffold with stable invite codes, future Pro-credit records, backup/export support, and no feature gating
- local deterministic Pro data explainer preview that summarizes this account's saved logs, cites matching strategy corpus entries as context only, and blocks dosing/prescribing/diagnosis requests
- automated copy/tone guardrails that scan app/content copy for moralized food or body-judgment phrases and keep the weekly digest in the body-tea voice
- backend workout seed file with validation-only exercises, programs, risk/source notes, and selected-exercise instructions in the account workspace
- outcome-first strategy explorer with one efficacy/risk graph per desired outcome
- strategy explorer opens as an overlay from the main header action
- clickable strategy dots with synopsis modal and dedicated strategy detail view
- backend-served strategy corpus seed at `/api/strategy-corpus`
- editable backend strategy corpus seed in `backend/app/data/strategy_corpus.seed.json`
- strategy corpus JSON export/import with validation for manually curated entries and linked n=1 case logs
- imported strategy corpus persists locally as an override with a reset-to-backend-seed control
- imported corpus source links render in strategy entries
- strategy detail pages render linked completed-protocol case logs with limitations and no recommendation framing
- corpus entries display safety flags, legal notes, cost, and personalization exclusion status
- strategy corpus is behind a local 18+ age gate
- high-risk corpus entries require an extra informational acknowledgment before opening
- importable corpus template in `strategy-corpus-template.json`
- structured curation validator for target profiles, strategy entries, and case logs via `backend/scripts/validate_curation.py`
- backend and Node corpus validation tests for API seed bounds, case-log links, import/export normalization, local overrides, safety gating, and rejected evidence levels
- Playwright desktop and phone-viewport frontend user-flow tests
- pytest backend API/service tests
- shared measurement schema file for frontend field metadata and backend Pydantic validation
- backend and Node schema tests for frontend/backend measurement alignment
- backend and Node entitlement tests proving current data tools stay non-paywalled
- persisted locale preference with a lightweight i18n message catalog for the
  top-level shell/header/navigation strings plus first-run onboarding and
  measurement-form chrome, measurement-guide chrome, Diet dashboard
  chrome/status strings, Body result/comparison/snapshot/population chrome,
  Strategy explorer chrome/safety copy, account
  shell/magic-link identity/share/widget/health-sync/live-update/backup/
  native-backup/encrypted-sync/auto-sync/personal-data-api/entitlement/
  referral/data-explainer/face-measurement/check-in-tracking/goal-protocol-planning/export/report controls, and printable progress
  report headings, empty states, and generated body rows
- Capacitor native-shell bootstrap with package scripts, app metadata, Vite `dist/` sync target, and backend `capacitor://localhost` CORS origin
- Capacitor Preferences-backed storage adapter that hydrates before first render,
  keeps synchronous UI storage reads working from a cache, and migrates existing
  `bodymod:` webview `localStorage` data into native key-value storage
- Node accessibility contrast tests for cafe/graphite theme tokens and Playwright keyboard/accessibility semantics coverage
- backend target-data and SQLite repository tests for IDs, schemas, and placeholder uncertainty notes
- target profile template and curation guide for future production target data
- graceful no-backend state for local form and snapshots
- offline comparison copy that keeps target comparison separate from local snapshot comparison
- CSS-custom-property theme system with cafe and graphite palettes
- App state split into measurement/unit, snapshot, and comparison hooks, keeping `App.jsx` as the orchestration shell
- public `/methodology.html` page for scoring, similarity, percentile, gender-score, and privacy methodology
- public `/measurement-guides/index.html` route plus one static how-to page for every measurable schema field
- public draft legal pages for privacy, terms, and medical disclaimer review

Not implemented yet:

- full production percentile replacement across all supported fields
- vetted ANSUR or equivalent breadth data behind the population charts; NHANES now covers adult height, weight, waist, and hip only
- production-quality target dataset
- production email delivery/provider setup, account recovery, or
  identity-linked production background sync/merge beyond the encrypted
  sync-vault, automatic sync preview, personal data API, and magic-link
  identity scaffolds
- hosted photo/body inference work; current face scans and manual side-profile logs are browser-local only
- production FoodData Central API ownership and seed replacement; Diet currently
  has dummy backend USDA-style seed rows, Open Food Facts lookup, and an
  offline FDC import scaffold for reviewed local exports
- source-reviewed procedure taxonomy and clinical/body-mod validation; current procedure data is a dummy review scaffold
- source-reviewed bloodwork marker taxonomy, units, and reference ranges; current bloodwork data is a dummy local-only review scaffold
- full app-wide translation coverage; current i18n work covers the shell,
  onboarding, measurement-form/guide chrome, Diet dashboard chrome/status
  strings, Body result/comparison/snapshot/population chrome, Strategy explorer
  chrome/safety copy, account shell/magic-link
  identity/share/widget/health-sync/live-update/backup/native-backup/
  encrypted-sync/auto-sync/personal-data-api/entitlement/referral/
  data-explainer/face-measurement/check-in-tracking/goal-protocol-planning/procedure/bloodwork/workout/photo-log/export/report controls, and generated progress report copy,
  while source, seed, and user-authored content remain English-first
- generated Android/iOS native project folders, store signing, APNs/FCM production credentials/device validation, real HealthKit/Health Connect plugin reads/writes, native home-screen widget extensions, iCloud/Google Drive backup policy wiring, native store icon generation, signed live-update provider/rollback policy, and native release workflows
- full public measurement-guide coverage with reviewed illustrations and final copy
- production error monitoring and product analytics provider/enablement
  decisions; sanitized first-party wiring exists but upload is disabled unless
  configured at build time
- production AI explain-my-data provider/model selection, account-tier gating,
  prompt-boundary review, and launch policy approval; current explainer is a
  local deterministic scaffold only
- final human copy/voice approval; automated tone guardrails exist, but they do
  not replace editorial review
- human/legal review of draft privacy, terms, and medical disclaimer pages
- manual launch-readiness gates must be resolved or removed from scope; the
  current checklist is exposed at `/api/launch-readiness` and in the account
  panel

## Current Measurement Schema

The app no longer uses the original seven-field MVP schema. The current schema is expanded in `shared/measurement_schema.json`, which feeds `frontend/src/lib/measurements.js` and the backend `MeasurementSet` model:

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

- extend the partial NHANES reference overlay with ANSUR or another vetted source for unsupported measurement fields
- expand and clean up the target library
- replace the seed strategy corpus with a manually sourced corpus
- continue mobile polish from Playwright coverage and manual screenshots
- decide whether production analytics are acceptable; first-party minimized
  analytics wiring exists but external provider/hosting is not approved

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
