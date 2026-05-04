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
    services.py
    data/
      reference.py
      targets.py
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

The backend currently uses in-code target data from `backend/app/data/targets.py`.

## Visual Direction

The current UI is a dense, utilitarian dark interface.

Current choices:

- Georgia/system serif typography
- plain bordered panels
- rectangular controls
- no rounded cards
- no decorative animation
- no gradients beyond the silhouette centerline background
- functional cool accent color for hover/anchor states

This differs from the earlier light/off-white recommendation. The built dark visual system is now the baseline unless intentionally redesigned.

## Implemented Modules

### Measurement Schema

Source files:

- `frontend/src/lib/measurements.js`
- `backend/app/models.py`

Status:

- implemented
- expanded beyond original MVP
- frontend/backend fields and min/max bounds are checked by backend tests

Next:

- consider generating one side from the other if the schema changes often

### Form And Validation

Source files:

- `frontend/src/components/MeasurementForm.jsx`
- `frontend/src/lib/measurements.js`
- `frontend/src/lib/units.js`
- `backend/app/models.py`

Status:

- implemented
- supports metric and imperial display
- supports field-level unit overrides
- validates ranges
- displays per-field help text
- Playwright covers decimal and paste-replacement numeric entry

Next:

- continue mobile polish from the phone-viewport Playwright coverage

### Silhouette Generator

Source files:

- `frontend/src/components/SilhouetteView.jsx`
- `frontend/src/lib/silhouette.js`

Status:

- implemented
- front-view only
- deterministic
- measurement anchors are interactive
- SVG title/description and human-readable anchor labels are exposed for assistive technology
- Playwright covers minimum and maximum valid measurement profiles

Next:

- continue manual visual QA across more real-world body shapes
- add comparison rendering variants

### Matching Engine

Source files:

- `backend/app/services.py`
- `backend/app/data/targets.py`

Status:

- implemented as scaffold logic
- height-normalized absolute distance plus shoulder/waist and waist/hip ratio terms
- target data is placeholder-quality
- explanation bullets are exposed in the response
- target list can be searched, filtered by source type, and sorted by score or name
- API and service tests cover ranking and response shape
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
- overlap mode currently overlays silhouettes rather than computing true diff regions
- no-backend state explains that target comparison needs loaded target profiles while snapshot comparison remains local
- current-vs-target measurement difference table is visible below the comparison renderer
- selected target type, source/placeholder note, and largest score-driver bullets are visible above the renderer

Next:

- decide whether overlap stays simple or becomes measurement-band diff

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
- `frontend/src/lib/storage.js`

Status:

- implemented
- saves, loads, and deletes local snapshots
- supports optional labels
- supports optional notes
- supports current-vs-snapshot comparison
- supports current-vs-selected-snapshot silhouette comparison in the vs Target pane
- supports compact newest-vs-oldest trend summary
- supports compact SVG trend chart for key local tracking metrics
- supports JSON export/import
- skips duplicate snapshot imports with an explicit status message
- restores most recent snapshot on return visit

Next:

- expand longitudinal charts if local tracking becomes a core workflow

### Method And Privacy Content

Source files:

- `frontend/src/components/InfoFootnote.jsx`

Status:

- method and privacy copy is collapsed into a hover/focus footnote
- local event count and clearing remain available inside the footnote

Next:

- update copy after share/analytics decisions

### Share Action

Status:

- implemented as a header share icon that copies a measurement payload URL
- no visible share URL panel is rendered

Options:

- create a backend snapshot ID
- revisit privacy stance before public launch

### Analytics

Status:

- implemented as lightweight local event logging in `localStorage`
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

- `frontend/src/components/StrategyCorpus.jsx`
- `frontend/src/lib/strategyCorpus.js`

Status:

- outcome-first explorer is implemented
- explorer opens as an overlay after the user chooses to work on an outcome
- one efficacy/risk plot is shown for the selected desired outcome
- clickable strategy dots open a synopsis modal
- strategy detail view is rendered after opening a strategy from the modal
- search/filter controls are scoped to the selected outcome
- review status, sensitivity, and source-count metadata are visible
- manual corpus curation rubric exists in `strategy-corpus-curation.md`
- corpus JSON export/import is implemented with frontend schema validation
- imported corpus can persist locally and be reset to the seed corpus
- imported source links render inside strategy entries
- safety flags, legal notes, cost, and personalization exclusion status are visible
- Node tests cover corpus template parsing, normalization, bounds clamping, invalid evidence rejection, and export round trips
- entries are illustrative and not yet source-reviewed
- copy explicitly separates information from advice

Next:

- manually source entries
- add evidence and risk taxonomy
- define exclusion/moderation rules
- decide whether curated corpus data should move to backend storage

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
- silhouette renders correctly at small and large widths
- local snapshots survive refresh
- comparison panel is visible and usable
- method/privacy information is visible
- placeholder math is clearly labeled
- local analytics and the share icon are implemented, with public-launch privacy decisions documented
- launch gates are tracked in `launch-decision-record.md`

## Non-Goals

Do not add these to the current build without a deliberate product decision:

- medical advice
- procedure or compound recommendation flows
- raw image upload
- AI assistant or chat UI
- account-gated usage
- social feed
- elaborate design system
- 3D renderer
