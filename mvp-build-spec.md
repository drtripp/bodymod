# Bodymod Build Spec

This document describes the product as it exists in the repo now, then lays out the next build targets. Current implementation is the source of truth.

## Product Shape

Bodymod is a measurement-driven body comparison and tracking tool.

The app currently lets a user:

1. Enter an expanded set of body measurements.
2. See a deterministic front-view SVG silhouette.
3. Fetch a ranked list of curated target profiles from the backend.
4. Compare the current profile against targets in side-by-side or overlap mode.
5. Save, label, note, load, compare, export, import, and delete local measurement snapshots in the browser.
6. Review a compact trend summary across saved local snapshots.
7. Inspect a seed informational strategy explorer organized by desired outcome.
8. Create a share URL that encodes the current measurement payload.

The product is intentionally not a guidance platform. It does not recommend procedures, compounds, dosing, medical decisions, or interventions.

## Current Stack

- Frontend: React 18, Vite, JavaScript
- Styling: one plain global CSS file
- Backend: FastAPI, Uvicorn, Pydantic
- Persistence: `localStorage`
- Rendering: SVG generated from measurement-derived geometry

Earlier planning recommended Next.js and TypeScript. That is no longer the current implementation.

## Current User Flow

### First Visit

1. User opens the single-page app.
2. User edits the default measurement set.
3. Results update after valid input once backend targets are available.
4. The result panel shows:
   - current silhouette
   - backend connection status
   - large top-match name
   - placeholder similarity score
   - runner-up match
   - six metric blocks for height, BMI, estimated body fat, SHR, WHR, and SWR
   - methodology note
5. The vs Target tab shows target comparison controls and measurement deltas.
6. User can select a target for comparison from the target selector.
7. The vs US Population tab shows approximate sex-colored scatter and distribution plots.
8. User can save the current measurement set locally.

### Return Visit

1. Local snapshots load from browser storage.
2. If at least one snapshot exists, the most recent snapshot populates the form.
3. User can load or delete saved snapshots.
4. User can compare the current measurement set against a saved snapshot.

## Current Measurement Schema

The implemented schema has expanded beyond the original seven fields.

Canonical fields:

- `height`
- `weight`
- `sex`
- `headCircumference`
- `neckCircumference`
- `biacromialWidth`
- `bideltoidWidth`
- `bideltoidCircumference`
- `armpitCircumference`
- `nippleCircumference`
- `underbustCircumference`
- `waistCircumference`
- `pantWaistCircumference`
- `hipCircumference`
- `upperThighCircumference`
- `midThighCircumference`
- `calfCircumference`
- `bicepCircumference`
- `upperForearmCircumference`
- `wristCircumference`

The frontend schema lives in `frontend/src/lib/measurements.js`. The backend request model lives in `backend/app/models.py`. These should remain aligned.

Backend tests now compare frontend field names and numeric min/max bounds against the Pydantic request model so drift is caught during verification.

Legacy field names from the first MVP notes, such as `shoulders`, `underbust`, `waist`, and `hips`, are only used as compatibility aliases during normalization where applicable.

## Implemented Features

### Measurement Entry

Implemented:

- grouped form sections
- metric and imperial display conversion
- per-field unit override controls
- per-field measurement help text
- frontend validation with range messages
- cleared numeric fields are treated as required instead of being coerced to zero
- backend validation through Pydantic
- default male and female baseline values
- phone-viewport Playwright coverage for dense workflow basics
- Playwright coverage for decimal measurement values and paste-replacement entry

### Silhouette Renderer

Implemented:

- front-view SVG renderer
- deterministic output from measurements
- shared renderer for user and target-like measurement sets
- interactive measurement anchors
- hover/focus coordination between form fields and silhouette anchors
- SVG title/description and human-readable anchor labels with values
- Playwright coverage for minimum and maximum valid measurement profiles

Still needed:

- manual visual QA across more real-world body shapes
- comparison-specific rendering states

### Matching Engine

Implemented:

- backend target list
- backend match endpoint
- curated placeholder targets
- target list search, source-type filtering, and score/name sorting
- height-normalized absolute distance score plus shoulder/waist and waist/hip ratio terms
- small sex mismatch penalty
- explanation bullets based on largest measurement gaps
- backend tests for ranking and API response shape
- target-data integrity tests for schema validity, unique IDs, source types, and visible placeholder notes
- target profile template and curation guide for future source-reviewed target data

Still needed:

- richer target dataset
- stronger scoring calibration

### Percentiles

Implemented:

- approximate adult-reference percentile estimates for height, waist, and bideltoid circumference
- explicit reference label noting the model is not NHANES-calibrated
- percentile monotonicity and bounds tests
- replacement data curation guide in `reference-data-curation.md`

Still needed:

- vetted reference-population data
- documented production percentile methodology

### Local Tracking

Implemented:

- save current measurements as a snapshot
- load a saved snapshot
- compare current measurements against a prior snapshot
- current-vs-prior silhouette comparison
- compact newest-vs-oldest snapshot trend summary
- delete a saved snapshot
- versioned `localStorage` payload
- optional snapshot labels
- optional snapshot notes
- JSON export/import
- duplicate snapshot imports are skipped with an explicit skipped-count status
- compact SVG trend chart for weight, waist, shoulder mass, and hip measurements

### Comparison, Trust, Share, And Corpus

Implemented:

- side-by-side target comparison
- simple overlap comparison
- current-vs-target measurement difference table
- target type, source/placeholder notes, and largest score-driver bullets in the vs Target pane
- result, vs Target, and vs US Population panes are tabbed in the main visual column
- first-draft US population scatter plots with sex-colored confidence bands
- first-draft male/female normal distribution plots with a vertical user-score marker
- method and privacy content collapsed into a hover/focus footnote
- header share icon that copies a measurement-encoded URL without showing a share panel
- local event logging for lightweight analytics
- privacy control for local event count and clearing local events
- outcome-first strategy explorer with one efficacy/risk plot per desired outcome
- strategy explorer opens as an overlay from the main header action
- clickable strategy dots with synopsis modal and dedicated detail view
- corpus search/filter controls scoped to the selected outcome
- corpus JSON export/import for future manual source review
- corpus curation rubric in `strategy-corpus-curation.md`
- imported corpus persistence in browser storage with reset-to-seed control
- imported source links render inside corpus entries
- safety flags, legal notes, cost, and personalization exclusion status are visible in corpus entries
- Node tests cover corpus template parsing, normalization, bounds clamping, invalid evidence rejection, and export round trips
- Playwright desktop and phone-viewport user-flow tests
- graceful no-backend state for form and local snapshots
- offline comparison copy separates backend target comparison from local snapshot comparison

Still needed:

- source-reviewed strategy corpus entries
- controlled backend/source-of-truth decision for curated corpus beyond local import
- vetted ANSUR, NHANES, or equivalent source tables for the population charts
- production analytics decision
- share-link privacy decision before public launch
- launch gate decision record in `launch-decision-record.md`

## Explicit Non-Goals For The Current App

- accounts and authentication
- cross-device history
- raw photo uploads
- AI-generated advice
- procedure, compound, or dosing guidance
- social feed or community protocols
- 3D rendering
- character imagery

## Near-Term Backlog

### Phase 1: Harden Current UI

- improve dense-form mobile ergonomics
- keep improving dense-form mobile ergonomics
- continue no-backend/offline QA as new target-dependent features are added

Exit condition:

- a user can complete the private tracking loop without fragile or unclear controls.

### Phase 2: Make Results More Trustworthy

- replace approximate percentile logic with vetted population data
- expand the target library beyond placeholder profiles
- document scoring and percentile methodology

Exit condition:

- the app output is clearly labeled, stable, and not pretending scaffold math is finished.

### Phase 3: Corpus Curation

- define evidence/risk/reversibility taxonomy
- manually source strategy entries
- add moderation/review status
- decide what high-risk content is excluded entirely

Exit condition:

- corpus entries are informational, sourced, and clearly separated from recommendations.

### Phase 4: Launch Layer

- decide whether encoded measurement URLs are acceptable for public launch or whether server-side snapshot IDs are needed
- decide whether local-only analytics are sufficient or whether a production analytics provider is justified
- harden deployment beyond the prototype notes in `deployment.md`
- run a final copy pass

Exit condition:

- a new user can land, use the tool, understand what is approximate, and optionally share or return.

## Success Criteria

The practical success bar is repeat use, not signups.

Signals worth tracking if production analytics are approved:

- completed valid result views
- saved local snapshots
- return visits with existing local snapshots
- selected target comparisons
- copied share links

Failure means the tool is not useful enough for a motivated user to revisit.
