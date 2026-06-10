# Site Implementation Plan

This plan reflects the current repo, not the older scaffold proposal. The app is already built as a React + Vite single-page frontend with a FastAPI backend.

## Current Architecture

```text
frontend/
  index.html
  package.json
  vite.config.js
  src/
    App.jsx
    main.jsx
    styles.css
    config.js
    components/
      ComparisonPanel.jsx
      InfoFootnote.jsx
      MeasurementForm.jsx
      PopulationPanel.jsx
      ResultSummary.jsx
      SilhouetteView.jsx
      SiteHeader.jsx
      SnapshotPanel.jsx
      StrategyCorpus.jsx
    lib/
      analytics.js
      api.js
      comparison.js
      populationCharts.js
      inference.js
      measurements.js
      share.js
      silhouette.js
      ratios.js
      storageAdapter.js
      storage.js
      strategyCorpus.js
      units.js
  tests/
    app.spec.js

backend/
  requirements.txt
  app/
    percentiles.py
    main.py
    models.py
    repositories.py
    services.py
    data/
      reference.py
      targets.seed.json
  tests/
    test_api.py
    test_services.py
```

## Current Frontend Flow

`App.jsx` owns:

- current canonical measurement state
- display measurement state
- validation errors
- backend health status
- fetched target profiles
- match result response
- derived ratio display
- local snapshots
- snapshot labels and selected comparison snapshot
- snapshot import/export status
- comparison mode and selected target
- share-link status
- persisted cafe/graphite theme preference
- global and per-field unit systems
- hovered measurement state

Rendered sections:

- `SiteHeader`
- `ResultSummary`
- `MeasurementForm`
- `SnapshotPanel`
- `ComparisonPanel`
- `PopulationPanel`
- `InfoFootnote`
- `StrategyCorpus`

The main visual column uses tabs for the result, vs Target, and vs US Population panes. The result
tab owns the current silhouette, large top-match name, placeholder similarity
score, runner-up match, and six compact metric blocks. The vs Target tab owns target comparison
and snapshot diff output. The vs US Population tab owns first-draft scatter and
normal-distribution reference plots; it intentionally does not use silhouettes.

## Current Backend API

Implemented endpoints:

- `GET /api/health`
- `GET /api/targets`
- `POST /api/match`
- `GET /api/entitlements`

The backend seeds target data from `backend/app/data/targets.seed.json` into
SQLite through `backend/app/repositories.py`.

## Visual Direction

The current UI is a dense, utilitarian interface with a warm cafe theme by
default and the earlier dark interface preserved as the persisted "graphite"
theme.

Current choices:

- Georgia/system serif typography
- CSS custom properties for cafe and graphite palettes
- plain bordered panels
- modest rounded geometry in cafe, squared geometry in graphite
- no decorative animation
- no gradients beyond the silhouette centerline background
- themed line-art silhouette washes and contour strokes
- sage/clay cafe accents and cool graphite accents for hover/anchor states

## Implemented Modules

### Measurement Schema

Source files:

- `shared/measurement_schema.json`
- `frontend/src/lib/measurements.js`
- `backend/app/measurement_schema.py`
- `backend/app/models.py`

Status:

- implemented
- expanded beyond original MVP
- frontend and backend derive measurement fields, bounds, select options, and
  defaults from the shared JSON schema
- backend and Node tests prove the generated Pydantic model and frontend
  exports stay attached to the shared artifact

### Form And Validation

Source files:

- `frontend/src/components/MeasurementForm.jsx`
- `frontend/src/lib/measurements.js`
- `frontend/src/lib/measurementGuides.js`
- `frontend/public/measurement-guides/index.html`
- `frontend/public/measurement-guides/*.html`
- `frontend/src/lib/units.js`
- `backend/app/models.py`

Status:

- implemented
- supports metric and imperial display
- supports field-level unit overrides
- validates ranges
- displays per-field help text
- links selected measurement guides to static public guide pages
- public guide batch covers every non-select measurement schema field with
  dummy copy mirrored from the backend guide library
- Playwright covers decimal and paste-replacement numeric entry

Next:

- continue mobile polish from the phone-viewport Playwright coverage
- replace dummy public guide copy and schematic illustrations after human
  public-copy/art review

### Silhouette Generator

Source files:

- `frontend/src/components/SilhouetteView.jsx`
- `frontend/src/lib/silhouette.js`
- `frontend/src/lib/silhouetteQaProfiles.js`

Status:

- implemented
- supports front-view and estimated side-view projections
- side view estimates profile depth from circumference relative to available
  width fields; it is deterministic projection, not camera-measured depth
- deterministic
- themed line-art wash, contour, and guide strokes are layered in the SVG
  component without changing the projection geometry
- measurement anchors are interactive
- SVG title/description and human-readable anchor labels are exposed for assistive technology
- 10 schema-complete QA profiles cover compact, broad, curvy, lean,
  high-BMI, lower-body, upper-body, return-to-form, and transition-tracking
  shapes
- Node projection tests assert every QA profile renders front and side paths,
  heads, and anchors inside the SVG viewBox
- Playwright covers minimum/maximum valid measurement profiles, the QA profile
  set through the real form, the front/side view toggle, and the themed
  line-art layer

Next:

- continue manual visual QA when production target data introduces new real
  profiles or sourced population shapes

### Matching Engine

Source files:

- `backend/app/services.py`
- `backend/app/repositories.py`
- `backend/app/data/targets.seed.json`
- `backend/app/data/match_priorities.py`

Status:

- implemented as scaffold logic
- height-normalized absolute distance plus shoulder/waist and waist/hip ratio terms
- backend-served match-priority presets adjust field and ratio weights for
  balanced, shoulders, and waist/hip matching
- target data is placeholder-quality
- target data is served from a SQLite repository seeded from JSON, not in-code dicts
- explanation bullets are exposed in the response
- target list can be searched, filtered by source type, and sorted by score or name
- API and service tests cover ranking and response shape
- API and service tests cover match-priority preset data and weighted score parts
- target-data integrity tests cover schema validity, unique IDs, source type, and visible placeholder notes
- target profile template and curation guide exist for future production data

Next:

- expand target data
- calibrate scoring weights

### Percentile Module

Source files:

- `backend/app/percentiles.py`
- `backend/app/data/reference.py`

Status:

- implemented as an approximate adult-reference model
- explicitly labeled as not NHANES-calibrated
- backend tests cover percentile monotonicity and bounds
- production replacement standard exists in `reference-data-curation.md`

Next:

- choose and load vetted reference data
- document methodology
- make UI copy clearly approximate

### Comparison Renderer

Source file:

- `frontend/src/components/ComparisonPanel.jsx`

Status:

- component is wired into `App.jsx`
- shown as the vs Target tab beside the result and vs US Population panes
- overlap mode pairs silhouette overlay with measurement-band diff regions
- no-backend state explains that target comparison needs loaded target profiles while snapshot comparison remains local
- current-vs-target measurement difference table is visible below the comparison renderer
- selected target type, source/placeholder note, and largest score-driver bullets are visible above the renderer
- supports the shared front/side silhouette view toggle

Next:

- continue visual QA across more real-world body shapes

### Population Renderer

Source files:

- `frontend/src/components/PopulationPanel.jsx`
- `frontend/src/lib/populationCharts.js`

Status:

- component is wired into `App.jsx`
- shown as the vs US Population tab
- renders sex-colored scatter plots with same-color confidence bands
- renders male/female normal distributions with a vertical user-score marker
- uses approximate first-draft reference values until vetted source tables are loaded

Next:

- replace scaffold reference values with ANSUR, NHANES, or another approved source
- document source methods and percentile limitations

### Local Snapshot Store

Source files:

- `frontend/src/components/SnapshotPanel.jsx`
- `frontend/src/lib/storageAdapter.js`
- `frontend/src/lib/storage.js`
- `frontend/src/lib/notifications.js`

Status:

- implemented
- persistence goes through a shared adapter with async methods for future native storage
- saves, loads, and deletes local snapshots
- supports optional labels
- supports optional notes
- supports current-vs-snapshot comparison
- supports current-vs-selected-snapshot silhouette comparison in the vs Target pane
- supports compact newest-vs-oldest trend summary
- supports compact SVG trend chart for key local tracking metrics
- supports per-metric snapshot history charts with range selection and note
  annotations from snapshot notes
- supports JSON export/import
- skips duplicate snapshot imports with an explicit status message
- restores most recent snapshot on return visit
- account panel supports a readable local JSON export even before account
  creation; snapshots, diet logs, food library rows, and fluid logs are always
  included, while signed-in account records are added when available
- account check-ins support historical weight CSV import through
  `frontend/src/lib/historyImport.js`, storing imported rows as normal
  daily-weight logs for trend weight and adaptive TDEE
- account check-ins support optional left/right bicep, forearm, thigh, and
  calf split logs through `frontend/src/lib/limbSymmetry.js`; the single
  measurement value remains the default for matching while dated split logs
  show symmetry deltas for physique tracking
- account check-ins support optional local cycle phase logs through
  `frontend/src/lib/cycleTracking.js`; the feature is off by default, flags
  noisy weight/waist interpretation windows in insight drops, is included in
  encrypted backup check-ins, and has a dedicated delete-cycle-logs action
- first Snapshot #1 save asks for browser notification permission only after a
  successful save; notification preferences stay local and stale weekly
  check-in reminders use data-decay framing rather than body judgment
- account workspace supports passphrase-encrypted backup/restore through
  `frontend/src/lib/localBackup.js`; photos are exported as metadata manifests
  rather than image payloads
- saved goals use `frontend/src/lib/goalTargets.js` for progress rows and
  maintenance drift alerts once a target-band snapshot exists
- saved goal rows include from-target, past-target, and at-target copy so
  progress is framed against the user's chosen target set
- saved goals pause progress and maintenance alerts while active life-event
  reliability windows affect any of their target metrics

Next:

- expand longitudinal charts if local tracking becomes a core workflow

### Diet Tracker

Source files:

- `frontend/src/components/DietDashboard.jsx`
- `frontend/src/lib/diet.js`
- `frontend/src/lib/storage.js`

Status:

- implemented as local-first browser storage
- backend USDA-style dummy generic food search and Open Food Facts search
  normalize macros and selected micronutrients into one result list
- barcode lookup still uses Open Food Facts
- custom foods, recent foods, favorites, saved meals, and latest-day copy are
  local-only
- pasted/file CSV import accepts flexible MFP/Cronometer-style date, meal, food,
  macro, and micronutrient headers through `frontend/src/lib/dietImport.js`
- macro targets use the placeholder Mifflin-St Jeor estimate and selectable
  goal/activity settings
- expanded micronutrient rows show actuals plus goal/limit percentages for
  fiber, sugar, sodium, potassium, calcium, iron, magnesium, zinc, vitamin C,
  vitamin D, and B12
- fluid logging tracks target-vs-actual progress

Next:

- replace dummy USDA-style rows with a production FDC import/API pipeline after
  credential and nutrient-validation decisions are made

### Method And Privacy Content

Source files:

- `frontend/src/components/InfoFootnote.jsx`
- `frontend/public/landing.html`
- `frontend/public/landing.css`
- `frontend/public/landing.js`
- `frontend/public/landing-assets/*.png`
- `frontend/public/methodology.html`
- `frontend/public/legal/index.html`
- `frontend/public/legal/privacy.html`
- `frontend/public/legal/terms.html`
- `frontend/public/legal/medical-disclaimer.html`

Status:

- method and privacy copy is collapsed into a hover/focus footnote
- footnote links to `/methodology.html`
- footnote links to draft legal pages for privacy, terms, and medical disclaimer
- public methodology page documents scoring, similarity mapping, percentile
  scaffold sources, gender-score chart math, and privacy boundaries
- public landing page at `/landing.html` describes the product, privacy
  stance, current screenshots, planned native-store placeholders, and local-only
  Pro waitlist capture
- draft legal pages are implemented as static public routes pending human/legal
  review
- local event count and clearing remain available inside the footnote

Next:

- update copy after share/analytics decisions
- replace draft legal copy with approved launch copy and ownership/contact
  details after review

### Share Action

Source files:

- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/repositories.py`
- `frontend/src/components/PublicShareDashboard.jsx`
- `frontend/src/lib/shareDashboard.js`
- `frontend/src/lib/share.js`

Status:

- implemented as a header share icon that copies a measurement payload URL
- no visible share URL panel is rendered
- signed-in account panel can publish, update, copy, and revoke an opt-in
  server-side read-only dashboard
- backend stores share dashboards in SQLite behind opaque public tokens and
  private revoke-token hashes
- public `?share=` URLs render a read-only dashboard with current measurements,
  recent snapshots, goal summaries, protocol summaries, and count stats
- share-dashboard payloads omit account email, local account IDs, notes, photo
  files, and face scan images

Options:

- decide whether to remove or retain encoded measurement share URLs at launch
- decide whether shared dashboards need expiration windows or redaction presets

### Analytics

Status:

- implemented as lightweight local event logging through the frontend storage adapter
- privacy section exposes local event count and a clear-local-events control
- no external analytics provider is wired

Candidate events:

- app loaded
- valid result rendered
- snapshot saved
- comparison target selected
- comparison mode changed
- share link copied

### Strategy Corpus

Source files:

- `backend/app/data/strategy_corpus.py`
- `backend/app/data/strategy_corpus.seed.json`
- `backend/scripts/validate_curation.py`
- `backend/app/main.py`
- `frontend/src/components/StrategyCorpus.jsx`
- `frontend/src/lib/strategyCorpus.js`

Status:

- outcome-first explorer is implemented
- backend exposes `/api/strategy-corpus` as the default corpus seed source
- explorer opens as an overlay after the user chooses to work on an outcome
- one efficacy/risk plot is shown for the selected desired outcome
- clickable strategy dots open a synopsis modal
- strategy detail view is rendered after opening a strategy from the modal
- search/filter controls are scoped to the selected outcome
- review status, sensitivity, and source-count metadata are visible
- manual corpus curation rubric exists in `strategy-corpus-curation.md`
- structured curation workflow exists for target profiles, strategy entries,
  and case logs through editable JSON seeds/templates plus
  `backend/scripts/validate_curation.py`
- corpus JSON export/import is implemented with frontend schema validation
- imported corpus can persist locally as an override and be reset to the
  backend seed when loaded, or to the bundled seed offline
- imported source links render inside strategy entries
- linked completed-protocol case logs render inside strategy detail pages with
  n=1 limitation copy and the same summary fields used by the protocol tracker
- safety flags, legal notes, cost, and personalization exclusion status are visible
- a local 18+ gate appears before corpus content is shown
- high-risk entries require a separate informational acknowledgment before opening
- backend tests validate the strategy corpus API seed, score bounds, linked
  case-log references, completed-protocol summary fields, and high-risk
  personalization exclusions
- Node tests cover corpus template parsing, normalization, case-log bundle
  parsing, bounds clamping, local age-gate storage, local override storage,
  high-risk classification, invalid evidence rejection, and export round trips
- entries are illustrative and not yet source-reviewed
- copy explicitly separates information from advice

Next:

- manually source entries
- add evidence and risk taxonomy
- finalize exclusion/moderation policy for sourced production entries
- expand the structured workflow into a richer internal UI only if JSON review
  becomes too slow

## Engineering Backlog

### Immediate

- update README whenever scope changes
- continue mobile form polish

### Next

- replace approximate percentile formulas with vetted reference data
- improve target data quality
- continue no-backend/offline QA as new target-dependent features are added

### Later

- harden deployment beyond the prototype notes in `deployment.md`
- larger target library
- production analytics provider if acceptable
- optional account system only if local storage becomes a real limitation

## Launch Checklist

- `.\verify.ps1` completes locally
- frontend build passes
- backend imports compile
- backend endpoints return expected payloads
- form works on mobile
- silhouette renders correctly at small and large widths, including themed line-art treatment
- local snapshots survive refresh
- comparison panel is visible and usable
- method/privacy information is visible
- draft privacy, terms, and medical disclaimer pages are reviewed
- placeholder math is clearly labeled
- local analytics and the share icon are implemented, with public-launch privacy decisions documented
- cafe and graphite themes are available, persisted locally, and covered by tests
- accessibility baseline is covered by skip-to-main navigation, visible focus
  rings, live status regions, form error associations, SVG chart descriptions,
  Escape-to-close dialogs, and contrast tests for both themes
- free/pro entitlement config is served by the backend, current data tools are
  tested as non-paywalled, and the local Pro waitlist is visible in the account panel
- deployment notes cover TLS/proxy handling, CORS origins, exact-pinned
  dependency updates, SQLite backup handling, and `/api/match` rate limiting;
  backend tests cover the `429` limiter path
- launch gates are tracked in `launch-decision-record.md`

## Non-Goals

Do not add these to the current build without a deliberate product decision:

- medical advice
- procedure or compound recommendation flows
- raw image upload
- AI assistant or chat UI
- account-gated usage
- social feed
- elaborate design system beyond the current CSS-token theme layer
- 3D renderer
