# Completion Audit

This audit maps the active build request to the current repository state.

## Objective

User request:

> read `body-modding-platform-plan.md` and flesh out this website with all desired features. Write a bunch of tests that simulate users making use of the front end. Once it's working, use `../local_inference/models/Qwen3.5-9B-UD-Q4_K_XL` hosted locally. It has vision capabilities, and should be able to see the webpage, attempt to use it, and find possible issues, both visual and mechanical.

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Read and reconcile `body-modding-platform-plan.md` | `body-modding-platform-plan.md` now separates current product, near-term roadmap, future feature areas, guardrails, and open questions. | Done |
| Rewrite docs using current repo state as truth | `README.md`, `mvp-build-spec.md`, `site-implementation-plan.md`, `body-modding-platform-plan.md`, and `deployment.md` describe the implemented React/Vite + FastAPI app rather than the older plan. | Done |
| Frontend state decomposition | `frontend/src/hooks/useMeasurementFormState.js`, `frontend/src/hooks/useSnapshotState.js`, and `frontend/src/hooks/useComparisonState.js` now own measurement/unit, snapshot, and comparison state so `frontend/src/App.jsx` remains the orchestration/render shell. | Done |
| Privacy-preserving client error wiring | `frontend/src/lib/errorMonitoring.js`, `frontend/src/main.jsx`, `backend/app/models.py`, `backend/app/repositories.py`, and `backend/app/main.py` implement sanitized browser error capture, a local ring buffer, opt-in upload, and the first-party `POST /api/client-errors` sink. Raw messages, stacks, measurements, and form payload fields are not part of the accepted envelope. | Agent wiring done; provider decision pending |
| Privacy-first product analytics wiring | `frontend/src/lib/analytics.js`, `frontend/src/lib/productAnalytics.js`, `frontend/src/components/InfoFootnote.jsx`, `backend/app/models.py`, `backend/app/repositories.py`, `backend/app/main.py`, and `frontend/tests/productAnalytics.node.mjs` implement a minimized analytics path: existing local usage events map to allowlisted product events, local event clearing removes both local buffers, optional upload uses the first-party `POST /api/product-analytics` sink, and raw properties or measurement payloads are rejected. | Agent wiring done; external provider decision pending |
| Remote web-push stale-trend scaffold | `frontend/src/lib/notifications.js`, `frontend/src/components/AccountGoalPanel.jsx`, `backend/app/models.py`, `backend/app/repositories.py`, `backend/app/web_push.py`, `backend/scripts/send_trend_push_reminders.py`, `backend/app/main.py`, and notification/backend tests implement VAPID config discovery, explicit browser subscription/unsubscribe controls, timestamp-only reminder scheduling, strict subscription envelopes, SQLite delivery-state tracking, and a dry-runable scheduled delivery worker without accepting measurement payloads. | Web scaffold done; native push pending |
| i18n groundwork | `frontend/src/lib/i18n.js`, `frontend/src/App.jsx`, `frontend/src/components/SiteHeader.jsx`, `frontend/tests/i18n.node.mjs`, and Playwright shell coverage implement persisted locale selection, a message catalog, fallback/interpolation helpers, and initial top-level shell/header/tab strings. | Groundwork done; full translation pass pending |
| Capacitor native-shell bootstrap | `frontend/package.json`, `frontend/package-lock.json`, `frontend/capacitor.config.json`, `frontend/native-readme.md`, `backend/app/main.py`, and `backend/tests/test_api.py` add Capacitor dependencies/scripts/config, a Vite `dist/` sync target, native setup notes, and default `capacitor://localhost` CORS support. | Web bootstrap done; generated Android/iOS projects, signing, and native plugins pending |
| Native Preferences storage adapter | `frontend/src/lib/storageAdapter.js`, `frontend/src/main.jsx`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/native-readme.md`, and `frontend/tests/storageAdapter.node.mjs` add `@capacitor/preferences`, switch the default adapter to Preferences inside native Capacitor runtimes, hydrate a synchronous cache before first render, migrate existing `bodymod:` webview `localStorage` keys, and preserve the web/memory adapter paths. | Done |
| Native photo asset storage | `frontend/src/lib/photoStorage.js`, `frontend/src/lib/account.js`, `frontend/src/components/AccountGoalPanel.jsx`, `frontend/src/lib/localBackup.js`, `frontend/src/lib/localExport.js`, `frontend/src/styles.css`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/native-readme.md`, and `frontend/tests/photos.node.mjs` add `@capacitor/filesystem`, store native progress-photo bytes under app data files, keep only metadata/file references in the account JSON store, hydrate file-backed photos back into gallery/comparison previews, delete orphaned asset files through the account UI, and keep readable/encrypted exports image-free. | Filesystem pass done |
| Flesh out measurement-first app features | `frontend/src/App.jsx`, components, and libs implement expanded measurement entry, validation, persisted cafe/graphite themes, skip-to-main navigation, visible focus rings, live status regions, form error associations, chart descriptions, front/side silhouette projections with themed line-art styling, a 10-profile silhouette QA fixture set, configurable match-priority presets, top match plus runner-up display, simplified result metrics, snapshots, local trend charting, per-metric snapshot history charts, historical weight CSV import, optional left/right limb-symmetry check-ins, optional local cycle phase logs, first-snapshot browser notification permission plus service-worker/fallback stale-trend reminder helpers, readable local JSON export with or without an account, encrypted local backup/restore, local free/pro entitlement display, Pro waitlist capture, opt-in read-only share dashboards, goal progress with target-relative distance copy, life-event goal pausing, first-class local procedure logs with healing windows/case logs/photo stream hints, maintenance drift alerts, current-vs-prior snapshot silhouette comparison, target metadata/explanation display, target difference tables, tabbed result / vs Target / vs US Population panes, Body/Diet top-level navigation, Diet backend USDA-style food search, Open Food Facts lookup/barcode/logging/import, expanded micronutrient target rows, header share action, method/privacy footnote, public landing page, public methodology page, public measurement-guide pages for every measurable schema field, draft legal pages, local events, and corpus UI. | Implemented as prototype |
| Backend target, match, entitlement, food, procedure, corpus, sharing, and hardening support | `backend/app/main.py`, `backend/app/rate_limit.py`, `backend/app/services.py`, `backend/app/repositories.py`, `backend/app/data/targets.seed.json`, `backend/app/data/match_priorities.py`, `backend/app/data/entitlements.py`, `backend/app/data/food_usda.py`, `backend/app/data/procedures.seed.json`, `backend/app/data/strategy_corpus.py`, `backend/app/data/strategy_corpus.seed.json`, `backend/app/models.py`, `backend/scripts/validate_curation.py`, `target-profiles-template.json`, and `target-profile-curation.md` expose health, targets, rate-limited match endpoints, configurable scoring-priority presets, free/pro entitlement config, dummy USDA-style food search data, a backend-served procedure taxonomy seed, a backend-served strategy corpus seed with linked case logs, a SQLite-backed target repository, an opaque-token share-dashboard repository/API, a target data template, and a structured curation validator. | Done |
| Measurement-guide seed scaffold | `backend/app/data/measurement_guides.seed.json`, `backend/app/data/measurement_guides.py`, `backend/scripts/validate_curation.py`, backend API/curation tests, and frontend measurement-guide tests provide dummy reviewable guide copy for every non-select measurement schema field with duplicate, missing-field, unknown-field, step, and illustration checks. | Seed scaffold done; reviewed public copy/art pending |
| USDA-style food seed scaffold | `backend/app/data/food_usda.seed.json`, `backend/app/data/food_usda.py`, `backend/scripts/validate_curation.py`, backend API/curation tests, and frontend Diet tests provide dummy FoodData Central-style rows with search keywords, dummy FDC provenance, required macro/micronutrient keys, and nonnegative nutrient validation. | Seed scaffold done; production FDC import/API pending |
| Local-only bloodwork scaffold | `backend/app/data/bloodwork.seed.json`, `backend/app/data/bloodwork.py`, `backend/app/main.py`, `backend/app/models.py`, `frontend/src/lib/bloodwork.js`, `frontend/src/components/AccountGoalPanel.jsx`, backup/export/report helpers, and Playwright/Node/backend tests implement a dummy marker/range library, account-scoped lab-result entry, trend rows, protocol links, local backup/report persistence, and explicit share-dashboard exclusion. | Implemented as prototype; source review pending |
| Honest referral scaffold | `backend/app/data/entitlements.py`, `backend/app/models.py`, `frontend/src/lib/entitlements.js`, `frontend/src/components/AccountGoalPanel.jsx`, local backup/export helpers, and entitlement/browser tests implement local invite codes and future Pro-credit records while keeping all current user data tools non-gated. | Implemented as prototype; production billing/accounts pending |
| Persona planning seed scaffold | `backend/app/data/planning.seed.json`, `backend/app/data/planning.py`, `backend/scripts/validate_curation.py`, and backend API/curation tests provide an editable 10-persona seed with goal presets, protocol templates, and dangling-reference validation for persona roleplay workflows. | Done as validation seed |
| Attractiveness evidence seed scaffold | `backend/app/data/attractiveness_evidence.seed.json`, `backend/app/data/attractiveness_evidence.py`, `backend/app/main.py`, `backend/scripts/validate_curation.py`, `frontend/src/lib/attractivenessEvidence.js`, `frontend/src/components/AccountGoalPanel.jsx`, and backend/frontend/browser tests provide reviewable goal-linked evidence notes with source IDs, ship-reference/do-not-ship/needs-research verdicts, and human-review gating. | Seed scaffold done; follow-up research and copy/source review pending |
| Workout library scaffold | `backend/app/data/exercises.seed.json`, `backend/app/data/exercises.py`, `backend/app/models.py`, `frontend/src/lib/workouts.js`, `frontend/src/components/AccountGoalPanel.jsx`, backend API tests, and Playwright account coverage provide a validation-only exercise/program seed file with dangling-reference checks, risk/source notes, selected-exercise instructions, local logging, PR summaries, and history charts. | Seed scaffold done; open-licensed production import pending |
| Hall linearized calorie-target projections | `frontend/src/lib/protocolPlanning.js`, `frontend/src/components/AccountGoalPanel.jsx`, `frontend/tests/protocolPlanning.node.mjs`, and `protocol-planning-notes.md` implement the documented Hall 2011 long-term linearized body-weight equation for calorie-target protocols, expose adult age/PAL/fat-mass assumptions, keep uncertainty bands, and state that the app is not the full NIH Body Weight Planner early-phase model. | Done |
| Mixed NHANES/scaffold percentile output | `backend/app/data/reference.seed.json`, `backend/app/data/reference.nhanes.seed.json`, `backend/app/data/reference.py`, `backend/app/percentiles.py`, `backend/app/main.py`, `frontend/src/lib/populationCharts.js`, and `reference-data-curation.md` implement a field-level reference model: official NHANES August 2021-August 2023 adult height, weight, waist, and hip overlays, labeled scaffold fallbacks for unsupported numeric schema fields, `/api/reference-data` provenance metadata, and `/api/match` `percentiles.fields` plus per-field source maps. | Partial vetted overlay done; ANSUR/full-field replacement still pending |
| Strategy corpus scaffold | `backend/app/data/strategy_corpus.py`, `backend/app/data/strategy_corpus.seed.json`, `frontend/src/components/StrategyCorpus.jsx`, `frontend/src/lib/strategyCorpus.js`, `frontend/tests/strategyCorpus.node.mjs`, `strategy-corpus-template.json`, and `strategy-corpus-curation.md` provide a backend API seed source, overlay-based outcome-first browsing, one efficacy/risk plot per selected outcome, clickable dot labels, synopsis modals, high-risk acknowledgments, strategy detail views, linked completed-protocol case logs with n=1 limitations, metadata, local 18+ age-gate storage, local import/export/persistence overrides, validation tests, a curation template, and a manual review rubric. | Scaffold done |
| Browser-local multi-profile scaffold | `frontend/src/lib/account.js`, `frontend/src/components/AccountGoalPanel.jsx`, `frontend/tests/accountTracking.node.mjs`, and `frontend/tests/app.spec.js` summarize separate account-scoped local stores and exercise one-click switching between two real local profiles through the account UI. | Local scaffold done; encrypted cross-device stores pending |
| Encrypted sync-vault scaffold | `backend/app/models.py`, `backend/app/repositories.py`, `backend/app/main.py`, `frontend/src/lib/encryptedSync.js`, `frontend/src/lib/localBackup.js`, `frontend/src/components/AccountGoalPanel.jsx`, `backend/tests/test_api.py`, `backend/tests/test_repositories.py`, `frontend/tests/encryptedSync.node.mjs`, `frontend/tests/localBackup.node.mjs`, and `frontend/tests/app.spec.js` implement a token-scoped `/api/sync-vaults` scaffold that stores only opaque encrypted backup blobs, hashed sync tokens, device IDs, revision metadata, stale-revision `409` conflicts, force overwrite support, account-panel create/push/pull/merge-and-push/force-push/revoke controls, local encrypted backup union by record ID, and frontend request helpers/tests that keep account emails, notes, and measurement keys out of sync request bodies. | Prototype account-panel workflow done; production identity/recovery and automatic background sync pending |
| Tests simulating frontend users | `frontend/tests/app.spec.js` and `frontend/tests/mobile.spec.js` cover desktop and phone workflows with mocked backend responses, persisted theme switching, keyboard landmarks, live statuses, chart descriptions, local Pro waitlist capture, no-backend behavior, target comparison, match-priority switching, front/side silhouette view switching and line-art rendering, population chart mode/axis controls, snapshots, snapshot history charts, first-snapshot notification permission storage, encoded and read-only server share flows, historical weight import, limb-symmetry logging, cycle-context logging/deletion, account-free and signed-in JSON export downloads, encrypted backup restore, encrypted sync-vault create/push/stale-conflict/merge/pull/revoke through the account UI, goal target-distance framing, life-event goal pausing, procedure tracker logging/backup/share/report persistence, maintenance drift alerts, Diet USDA/Open Food Facts search, barcode/logging/import, expanded micronutrient totals, public landing, methodology, measurement-guide, and legal page availability, 10 persona account walkthroughs including Jules' procedure log, strategy corpus age gating, high-risk corpus acknowledgment, linked strategy case-log rendering/import, and strategy corpus use. Node helper suites cover parser, crypto, chart, projection, real-world silhouette QA profiles, comparison variants, accessibility contrast, notification permission/reminder behavior, procedure normalization/healing/case-log behavior, share-dashboard payload privacy/local state, encrypted sync blob privacy/local credential state, local backup merge, entitlement non-gating, theme persistence, corpus safety gating, case-log bundle parsing, measurement-guide routing/static page coverage, limb-symmetry calculations, cycle-context calculations, goal pause rules, local JSON export shape, and calculation behavior. | Done |
| Screenshot capture for visual/model review | `frontend/tests/capture-screenshots.mjs`, `npm run capture:screenshots`, and `review-screenshots/*.png` capture desktop and mobile review states after opening the vs Target overlap view. | Done |
| Use local Qwen vision model | Earlier local Qwen review artifacts were removed from the test/review suite at user request. Current verification relies on deterministic tests and screenshot capture. | Removed from scope |
| Verification of backend behavior | `backend/tests/` covers API, service ranking, schema alignment, target data, curation workflow validation, and percentile bounds/monotonicity. | Done |
| Production-quality corpus content | Only seed entries and an import template exist. Source-reviewed corpus entries remain manual research work. | Not done |
| Production-quality target dataset | Current targets are placeholder/archetype profiles with uncertainty notes. `target-profiles-template.json` and `target-profile-curation.md` define the handoff format and rubric. | Not done |
| Vetted percentile methodology | Current model is partially source-backed: NHANES adult height, weight, waist, and hip use official tables with documented p5/p95-derived SD estimates; unsupported fields remain scaffold estimates. `reference-data-curation.md` defines the remaining ANSUR/full-field replacement standard. | Partial |
| Public launch policy decisions | Share URL privacy, production analytics, accounts, photo/AI scope, legal page approval, and corpus moderation gates are captured in `launch-decision-record.md`, but decisions are not approved. | Not done |

## Latest Verification Commands

Full wrapper:

```powershell
.\verify.ps1
```

The wrapper runs the component commands below and cleans Playwright output.

```bash
cd frontend
npm run test:corpus
npm run test:diet
npm run test:diet-import
npm run test:adaptive-tdee
npm run test:accessibility
npm run test:silhouette
npm run test:photos
npm run test:history-import
npm run test:local-backup
npm run test:storage
npm run test:tracking
npm run test:theme
npm run test:measurement-schema
npm run test:entitlements
npm run test:error-monitoring
npm run test:population
npm run build
npm run test:e2e
npm run capture:screenshots
```

Observed result:

- frontend build passed
- backend pytest passed `57` tests
- curation JSON validation passed for target/corpus seeds and templates
- Node corpus validation passed `8` tests
- Node diet validation passed `13` tests
- Node diet CSV import validation passed `4` tests
- Node accessibility contrast validation passed `1` test
- Node notification validation passed `11` tests
- Node share-dashboard validation passed `2` tests
- Node storage adapter validation passed `6` tests, including Capacitor
  Preferences hydration, native cache reads, and `bodymod:` webview
  `localStorage` migration
- Node comparison validation passed `3` tests
- Node silhouette projection validation passed `5` tests
- Node photo validation passed `4` tests, including native Filesystem-backed
  asset storage, metadata-only account persistence, hydration, and deletion
- Node historical weight import validation passed `4` tests
- Node encrypted local backup validation passed `6` tests
- Node encrypted sync validation passed `4` tests
- Node theme preference validation passed `3` tests
- Node shared measurement schema validation passed `3` tests
- Node entitlement validation passed `3` tests
- Node error monitoring validation passed `4` tests
- Node product analytics validation passed `8` tests
- Node population chart validation passed `6` tests
- Node measurement guide validation passed `4` tests
- all frontend Node helper suites in `verify.ps1` passed
- Playwright passed `20` tests
- screenshot capture passed through `npm run capture:screenshots`
- desktop/mobile screenshot review passed; targeted side-view, match-priority,
  accessibility keyboard path, Diet micronutrient, Diet USDA-style search,
  silhouette QA profile,
  methodology-page, public
  measurement-guide page, legal draft page, graphite-theme, account
  entitlement, corpus age-gate, high-risk acknowledgment, and strategy
  case-log detail screenshots
  confirmed the estimated profile projection, priority selector, expanded
  nutrient cards, backend food-source labels, theme toggle, free/pro access
  section, waitlist form, methodology copy, public guide copy, draft legal
  copy, corpus safety controls, and linked case-log detail layout are readable
  on desktop and mobile
- `.\verify.ps1` completed successfully

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Observed result:

- backend pytest passed `57` tests

## Current Decision

The goal is not complete as a production product. The code and docs now cover the prototype implementation, tests, and screenshot capture. The remaining work requires manual product/content decisions and external source review:

- source-reviewed corpus entries using the rubric in `strategy-corpus-curation.md`
- production target profiles using `target-profile-curation.md`
- broader vetted percentile reference data for unsupported fields using `reference-data-curation.md`
- source-reviewed procedure and bloodwork taxonomies/ranges using `manual-work-queue.md`
- launch privacy and moderation approvals from `launch-decision-record.md`

The concrete manual input queue is tracked in `manual-work-queue.md`.
