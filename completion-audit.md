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
| Flesh out measurement-first app features | `frontend/src/App.jsx`, components, and libs implement expanded measurement entry, validation, persisted cafe/graphite themes, front/side silhouette projections with themed line-art styling, configurable match-priority presets, top match plus runner-up display, simplified result metrics, snapshots, local trend charting, per-metric snapshot history charts, historical weight CSV import, optional left/right limb-symmetry check-ins, optional local cycle phase logs, readable local JSON export with or without an account, encrypted local backup/restore, local free/pro entitlement display, Pro waitlist capture, goal progress with target-relative distance copy, life-event goal pausing, maintenance drift alerts, current-vs-prior snapshot silhouette comparison, target metadata/explanation display, target difference tables, tabbed result / vs Target / vs US Population panes, Body/Diet top-level navigation, Diet backend USDA-style food search, Open Food Facts lookup/barcode/logging/import, expanded micronutrient target rows, header share action, method/privacy footnote, public landing page, public methodology page, public measurement-guide pages for every measurable schema field, draft legal pages, local events, and corpus UI. | Implemented as prototype |
| Backend target, match, entitlement, and food data support | `backend/app/main.py`, `backend/app/services.py`, `backend/app/repositories.py`, `backend/app/data/targets.seed.json`, `backend/app/data/match_priorities.py`, `backend/app/data/entitlements.py`, `backend/app/data/food_usda.py`, `backend/app/models.py`, `target-profiles-template.json`, and `target-profile-curation.md` expose health, targets, match endpoints, configurable scoring-priority presets, free/pro entitlement config, dummy USDA-style food search data, a SQLite-backed target repository, a target data template, and a target curation rubric. | Done |
| Approximate percentile output | `backend/app/percentiles.py`, `backend/app/data/reference.py`, and `reference-data-curation.md` implement labeled approximate reference percentiles and define the production replacement standard. | Prototype only |
| Strategy corpus scaffold | `frontend/src/components/StrategyCorpus.jsx`, `frontend/src/lib/strategyCorpus.js`, `frontend/tests/strategyCorpus.node.mjs`, `strategy-corpus-template.json`, and `strategy-corpus-curation.md` provide overlay-based outcome-first browsing, one efficacy/risk plot per selected outcome, clickable dot labels, synopsis modals, high-risk acknowledgments, strategy detail views, metadata, local 18+ age-gate storage, local import/export/persistence, validation tests, a curation template, and a manual review rubric. | Scaffold done |
| Tests simulating frontend users | `frontend/tests/app.spec.js` and `frontend/tests/mobile.spec.js` cover desktop and phone workflows with mocked backend responses, persisted theme switching, local Pro waitlist capture, no-backend behavior, target comparison, match-priority switching, front/side silhouette view switching and line-art rendering, population chart mode/axis controls, snapshots, snapshot history charts, sharing, historical weight import, limb-symmetry logging, cycle-context logging/deletion, account-free and signed-in JSON export downloads, encrypted backup restore, goal target-distance framing, life-event goal pausing, maintenance drift alerts, Diet USDA/Open Food Facts search, barcode/logging/import, expanded micronutrient totals, public landing, methodology, measurement-guide, and legal page availability, 10 persona account walkthroughs, strategy corpus age gating, high-risk corpus acknowledgment, and strategy corpus use. Node helper suites cover parser, crypto, chart, projection, entitlement non-gating, theme persistence, corpus safety gating, measurement-guide routing/static page coverage, limb-symmetry calculations, cycle-context calculations, goal pause rules, local JSON export shape, and calculation behavior. | Done |
| Screenshot capture for visual/model review | `frontend/tests/capture-screenshots.mjs`, `npm run capture:screenshots`, and `review-screenshots/*.png` capture desktop and mobile review states after opening the vs Target overlap view. | Done |
| Use local Qwen vision model | Earlier local Qwen review artifacts were removed from the test/review suite at user request. Current verification relies on deterministic tests and screenshot capture. | Removed from scope |
| Verification of backend behavior | `backend/tests/` covers API, service ranking, schema alignment, target data, and percentile bounds/monotonicity. | Done |
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
npm run test:silhouette
npm run test:history-import
npm run test:local-backup
npm run test:tracking
npm run test:theme
npm run test:measurement-schema
npm run test:entitlements
npm run build
npm run test:e2e
npm run capture:screenshots
```

Observed result:

- frontend build passed
- Node corpus validation passed `6` tests
- Node diet validation passed `13` tests
- Node diet CSV import validation passed `4` tests
- Node silhouette projection validation passed `2` tests
- Node historical weight import validation passed `4` tests
- Node encrypted local backup validation passed `4` tests
- Node theme preference validation passed `3` tests
- Node shared measurement schema validation passed `3` tests
- Node entitlement validation passed `3` tests
- Node measurement guide validation passed `4` tests
- all frontend Node helper suites in `verify.ps1` passed
- Playwright passed `16` tests
- screenshot capture passed through `npm run capture:screenshots`
- desktop/mobile screenshot review passed; targeted side-view, match-priority,
  Diet micronutrient, Diet USDA-style search, methodology-page, public
  measurement-guide page, legal draft page, graphite-theme, account
  entitlement, corpus age-gate, and high-risk acknowledgment screenshots
  confirmed the estimated profile projection, priority selector, expanded
  nutrient cards, backend food-source labels, theme toggle, free/pro access
  section, waitlist form, methodology copy, public guide copy, draft legal
  copy, and corpus safety controls are readable on desktop and mobile
- `.\verify.ps1` completed successfully

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Observed result:

- backend pytest passed `29` tests

## Current Decision

The goal is not complete as a production product. The code and docs now cover the prototype implementation, tests, and screenshot capture. The remaining work requires manual product/content decisions and external source review:

- source-reviewed corpus entries using the rubric in `strategy-corpus-curation.md`
- production target profiles using `target-profile-curation.md`
- vetted percentile reference data using `reference-data-curation.md`
- launch privacy and moderation approvals from `launch-decision-record.md`

The concrete manual input queue is tracked in `manual-work-queue.md`.
