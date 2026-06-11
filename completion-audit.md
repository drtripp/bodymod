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
| i18n groundwork | `frontend/src/lib/i18n.js`, `frontend/src/App.jsx`, `frontend/src/components/SiteHeader.jsx`, `frontend/tests/i18n.node.mjs`, and Playwright shell coverage implement persisted locale selection, a message catalog, fallback/interpolation helpers, and initial top-level shell/header/tab strings. | Groundwork done; full translation pass pending |
| Flesh out measurement-first app features | `frontend/src/App.jsx`, components, and libs implement expanded measurement entry, validation, persisted cafe/graphite themes, skip-to-main navigation, visible focus rings, live status regions, form error associations, chart descriptions, front/side silhouette projections with themed line-art styling, a 10-profile silhouette QA fixture set, configurable match-priority presets, top match plus runner-up display, simplified result metrics, snapshots, local trend charting, per-metric snapshot history charts, historical weight CSV import, optional left/right limb-symmetry check-ins, optional local cycle phase logs, first-snapshot browser notification permission and stale-trend reminder helpers, readable local JSON export with or without an account, encrypted local backup/restore, local free/pro entitlement display, Pro waitlist capture, opt-in read-only share dashboards, goal progress with target-relative distance copy, life-event goal pausing, first-class local procedure logs with healing windows/case logs/photo stream hints, maintenance drift alerts, current-vs-prior snapshot silhouette comparison, target metadata/explanation display, target difference tables, tabbed result / vs Target / vs US Population panes, Body/Diet top-level navigation, Diet backend USDA-style food search, Open Food Facts lookup/barcode/logging/import, expanded micronutrient target rows, header share action, method/privacy footnote, public landing page, public methodology page, public measurement-guide pages for every measurable schema field, draft legal pages, local events, and corpus UI. | Implemented as prototype |
| Backend target, match, entitlement, food, procedure, corpus, sharing, and hardening support | `backend/app/main.py`, `backend/app/rate_limit.py`, `backend/app/services.py`, `backend/app/repositories.py`, `backend/app/data/targets.seed.json`, `backend/app/data/match_priorities.py`, `backend/app/data/entitlements.py`, `backend/app/data/food_usda.py`, `backend/app/data/procedures.seed.json`, `backend/app/data/strategy_corpus.py`, `backend/app/data/strategy_corpus.seed.json`, `backend/app/models.py`, `backend/scripts/validate_curation.py`, `target-profiles-template.json`, and `target-profile-curation.md` expose health, targets, rate-limited match endpoints, configurable scoring-priority presets, free/pro entitlement config, dummy USDA-style food search data, a backend-served procedure taxonomy seed, a backend-served strategy corpus seed with linked case logs, a SQLite-backed target repository, an opaque-token share-dashboard repository/API, a target data template, and a structured curation validator. | Done |
| Local-only bloodwork scaffold | `backend/app/data/bloodwork.seed.json`, `backend/app/data/bloodwork.py`, `backend/app/main.py`, `backend/app/models.py`, `frontend/src/lib/bloodwork.js`, `frontend/src/components/AccountGoalPanel.jsx`, backup/export/report helpers, and Playwright/Node/backend tests implement a dummy marker/range library, account-scoped lab-result entry, trend rows, protocol links, local backup/report persistence, and explicit share-dashboard exclusion. | Implemented as prototype; source review pending |
| Honest referral scaffold | `backend/app/data/entitlements.py`, `backend/app/models.py`, `frontend/src/lib/entitlements.js`, `frontend/src/components/AccountGoalPanel.jsx`, local backup/export helpers, and entitlement/browser tests implement local invite codes and future Pro-credit records while keeping all current user data tools non-gated. | Implemented as prototype; production billing/accounts pending |
| Hall linearized calorie-target projections | `frontend/src/lib/protocolPlanning.js`, `frontend/src/components/AccountGoalPanel.jsx`, `frontend/tests/protocolPlanning.node.mjs`, and `protocol-planning-notes.md` implement the documented Hall 2011 long-term linearized body-weight equation for calorie-target protocols, expose adult age/PAL/fat-mass assumptions, keep uncertainty bands, and state that the app is not the full NIH Body Weight Planner early-phase model. | Done |
| Approximate percentile and reference output | `backend/app/data/reference.seed.json`, `backend/app/data/reference.py`, `backend/app/percentiles.py`, `backend/app/main.py`, `frontend/src/lib/populationCharts.js`, and `reference-data-curation.md` implement a labeled dummy reference scaffold for every numeric measurement schema field, serve it through `GET /api/reference-data`, return `percentiles.fields` from `/api/match`, and define the production replacement standard. | Schema-wide dummy prototype; vetted data still not done |
| Strategy corpus scaffold | `backend/app/data/strategy_corpus.py`, `backend/app/data/strategy_corpus.seed.json`, `frontend/src/components/StrategyCorpus.jsx`, `frontend/src/lib/strategyCorpus.js`, `frontend/tests/strategyCorpus.node.mjs`, `strategy-corpus-template.json`, and `strategy-corpus-curation.md` provide a backend API seed source, overlay-based outcome-first browsing, one efficacy/risk plot per selected outcome, clickable dot labels, synopsis modals, high-risk acknowledgments, strategy detail views, linked completed-protocol case logs with n=1 limitations, metadata, local 18+ age-gate storage, local import/export/persistence overrides, validation tests, a curation template, and a manual review rubric. | Scaffold done |
| Tests simulating frontend users | `frontend/tests/app.spec.js` and `frontend/tests/mobile.spec.js` cover desktop and phone workflows with mocked backend responses, persisted theme switching, keyboard landmarks, live statuses, chart descriptions, local Pro waitlist capture, no-backend behavior, target comparison, match-priority switching, front/side silhouette view switching and line-art rendering, population chart mode/axis controls, snapshots, snapshot history charts, first-snapshot notification permission storage, encoded and read-only server share flows, historical weight import, limb-symmetry logging, cycle-context logging/deletion, account-free and signed-in JSON export downloads, encrypted backup restore, goal target-distance framing, life-event goal pausing, procedure tracker logging/backup/share/report persistence, maintenance drift alerts, Diet USDA/Open Food Facts search, barcode/logging/import, expanded micronutrient totals, public landing, methodology, measurement-guide, and legal page availability, 10 persona account walkthroughs including Jules' procedure log, strategy corpus age gating, high-risk corpus acknowledgment, linked strategy case-log rendering/import, and strategy corpus use. Node helper suites cover parser, crypto, chart, projection, real-world silhouette QA profiles, comparison variants, accessibility contrast, notification permission/reminder behavior, procedure normalization/healing/case-log behavior, share-dashboard payload privacy/local state, entitlement non-gating, theme persistence, corpus safety gating, case-log bundle parsing, measurement-guide routing/static page coverage, limb-symmetry calculations, cycle-context calculations, goal pause rules, local JSON export shape, and calculation behavior. | Done |
| Screenshot capture for visual/model review | `frontend/tests/capture-screenshots.mjs`, `npm run capture:screenshots`, and `review-screenshots/*.png` capture desktop and mobile review states after opening the vs Target overlap view. | Done |
| Use local Qwen vision model | Earlier local Qwen review artifacts were removed from the test/review suite at user request. Current verification relies on deterministic tests and screenshot capture. | Removed from scope |
| Verification of backend behavior | `backend/tests/` covers API, service ranking, schema alignment, target data, curation workflow validation, and percentile bounds/monotonicity. | Done |
| Production-quality corpus content | Only seed entries and an import template exist. Source-reviewed corpus entries remain manual research work. | Not done |
| Production-quality target dataset | Current targets are placeholder/archetype profiles with uncertainty notes. `target-profiles-template.json` and `target-profile-curation.md` define the handoff format and rubric. | Not done |
| Vetted percentile methodology | Current model is explicitly approximate and not NHANES-calibrated. `reference-data-curation.md` defines the handoff standard for replacement data. | Not done |
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
npm run test:history-import
npm run test:local-backup
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
- backend pytest passed `40` tests
- curation JSON validation passed for target/corpus seeds and templates
- Node corpus validation passed `8` tests
- Node diet validation passed `13` tests
- Node diet CSV import validation passed `4` tests
- Node accessibility contrast validation passed `1` test
- Node notification validation passed `5` tests
- Node share-dashboard validation passed `2` tests
- Node comparison validation passed `3` tests
- Node silhouette projection validation passed `5` tests
- Node historical weight import validation passed `4` tests
- Node encrypted local backup validation passed `5` tests
- Node theme preference validation passed `3` tests
- Node shared measurement schema validation passed `3` tests
- Node entitlement validation passed `3` tests
- Node error monitoring validation passed `4` tests
- Node population chart validation passed `6` tests
- Node measurement guide validation passed `4` tests
- all frontend Node helper suites in `verify.ps1` passed
- Playwright passed `19` tests
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

- backend pytest passed `40` tests

## Current Decision

The goal is not complete as a production product. The code and docs now cover the prototype implementation, tests, and screenshot capture. The remaining work requires manual product/content decisions and external source review:

- source-reviewed corpus entries using the rubric in `strategy-corpus-curation.md`
- production target profiles using `target-profile-curation.md`
- vetted percentile reference data using `reference-data-curation.md`
- source-reviewed procedure and bloodwork taxonomies/ranges using `manual-work-queue.md`
- launch privacy and moderation approvals from `launch-decision-record.md`

The concrete manual input queue is tracked in `manual-work-queue.md`.
