# Feature Backlog

The full build-out list: everything planned in the repo docs, everything agreed
in planning sessions, plus new proposals marked **(new)**. Nothing here is
parked — this is the whole map. Strategy rationale lives in
`product-strategy-notes.md`; standing constraints live in
`launch-decision-record.md`.

Tags:

- **[human]** — blocked on Dawson input (data curation, decisions, accounts,
  money). Coding agents should skip or stub these.
- **(new)** — proposed in this document, not previously discussed.

Items are grouped by workstream and roughly ordered by dependency within each
group. A sane overall starting order for agents: Infrastructure prep →
Reference Data → Similarity → Check-In Cadence → Onboarding → Theming →
Protocol Tracker → Diet upgrades → Native app.

## 1. Infrastructure Prep (do these before the feature wave)

- [x] Theme system: refactor `frontend/src/styles.css` onto CSS custom
      properties with two themes — "cafe" (new warm default: paper/cream base,
      terracotta/clay/sage accents, rounded geometry) and "graphite" (current
      dark system), user-toggleable, persisted locally.
- [x] Storage adapter: frontend persistence now goes through
      `frontend/src/lib/storageAdapter.js`, which exposes async adapter methods
      for web `localStorage`, a Capacitor Preferences-backed native adapter,
      and a memory test adapter while preserving the current synchronous UI
      helpers through a hydrated cache.
- [x] Decompose `App.jsx` (~500 lines): extract state into hooks/contexts per
      domain (measurements, snapshots, comparison, units) before the feature
      wave makes it worse. Measurement/unit state now lives in
      `frontend/src/hooks/useMeasurementFormState.js`, snapshot persistence in
      `frontend/src/hooks/useSnapshotState.js`, and comparison target/filter
      state in `frontend/src/hooks/useComparisonState.js`; `App.jsx` remains
      the rendering/orchestration shell.
- [x] Backend database migration: targets now seed from
      `backend/app/data/targets.seed.json` into SQLite via
      `backend/app/repositories.py`, keeping current API shapes and tests
      green. Corpus/case-log backend migration remains tracked in section 17.
- [x] CI: GitHub Actions now runs `verify.ps1` on push/PR via
      `.github/workflows/verify.yml`, covering pytest, Node tests, build,
      Playwright, and screenshot capture.
- [ ] Error monitoring decision + wiring (privacy-conscious, e.g. self-hosted
      Sentry/GlitchTip; no measurement values in payloads). **[human]** for the
      provider decision, agent for the wiring. Agent wiring is in place:
      `frontend/src/lib/errorMonitoring.js` installs sanitized browser error
      capture, keeps a local ring buffer, and can opt in to the first-party
      `POST /api/client-errors` sink without raw messages, stacks, or
      measurement payloads. Human provider/enablement decision remains open.
- [x] Schema single-source: `shared/measurement_schema.json` now defines
      field order, labels, categories, bounds, select options, and defaults;
      the frontend measurement helpers import it directly and the backend
      builds the Pydantic `MeasurementSet` from it. Backend and Node tests keep
      the shared artifact covered.
- [x] i18n groundwork **(new)**: extract user-facing strings behind a
      lightweight i18n layer now, while the copy surface is small;
      full translations come later. Implemented as a persisted locale
      preference, message catalog, fallback/interpolation helpers, and
      English/Spanish coverage for the top-level shell/header/tabs, first-run
      onboarding, measurement categories/field labels/help, unit controls, and
      measurement-guide chrome, plus printable progress-report headings and
      empty states. Node tests keep locale persistence, fallback interpolation,
      English/Spanish catalog parity, and localized progress-report output
      covered; Playwright verifies the Spanish onboarding/form surface and
      localized report download.
      Full app-wide copy extraction, deeper account/diet/strategy copy, and
      long-form report translation remain future passes.

## 2. Reference Data & Scoring

- [ ] ANSUR II ingestion: download, map fields to the measurement schema, unit
      conversion, build sex-specific empirical percentile tables; replace
      `backend/app/data/reference.py` scaffold; follow
      `reference-data-curation.md`; document source/license/methodology.
      First importer scaffold is in:
      `backend/scripts/build_ansur_reference.py` plus
      `backend/app/data/reference.ansur.mapping.json`; it can convert a locally
      reviewed ANSUR-style CSV into review-gated reference overlay JSON with
      sex-specific means, SDs, and percentiles. Real source download,
      license/codebook review, and production wiring remain pending.
- [x] NHANES supplement for general-US height/weight/waist (ANSUR is a
      military population; show both labels honestly). Implemented with
      official NHANES August 2021-August 2023 adult height, weight, waist, and
      hip tables as a field-level overlay; unsupported fields remain labeled
      scaffold estimates.
- [ ] Replace population-panel scatter/distribution scaffold values with the
      vetted tables; update copy and reference labels. Backend reference data
      now feeds the panel through `GET /api/reference-data`, with NHANES-backed
      adult height/weight/waist/hip rows and field-level provenance, but ANSUR
      or equivalent replacement data remains open for unsupported fields.
      The ANSUR importer scaffold does not mark generated output vetted unless
      run after manual source review.
- [x] Sex-specific percentile output for every schema field the data supports
      (currently dummy scaffold data): `backend/app/data/reference.seed.json`
      covers every numeric measurement schema field, `/api/match` returns a
      `percentiles.fields` map, and legacy height/waist/shoulder percentile
      keys remain for existing result-card UI.
- [x] Calibrated similarity score per `similarity-score-spec.md` (mapping,
      API field, frontend display, calibration script, tests). Implemented as
      backend `similarity_from_distance`, API `similarity` fields, frontend
      result-card/display copy, calibration script, and backend/browser
      regression coverage.
- [ ] Recalibrate scoring weights once real target data exists. **[human]**
      sign-off on weight changes.
- [x] Configurable match priorities: backend-served weighting presets now
      include balanced, prioritize shoulders, and prioritize waist/hip modes;
      the selected preset is sent to `/api/match`, changes score-part weights,
      and is exposed in the result UI.
- [ ] Attractiveness evidence base **(new)**: sourced summary of the
      peer-reviewed literature on measurable attractiveness correlates — WHR
      (best-studied), shoulder-to-waist ratio, BMI preference ranges,
      leg-to-body ratio, fWHR, symmetry/averageness — distilled into
      evidence-based goal presets with citations and effect-size honesty.
      Population-level preference data framed as reference, never
      prescription. Feeds the goal system (Protocol Tracker) and the
      face-metric work in section 3. **[human]**/research task — strong
      deep-research candidate. **First pass done: see
      `attractiveness-evidence-base.md`** — shippable metrics are female
      WHR ~0.7, male BMI 23-27, facial averageness, female facial femininity;
      everything else is contested or uncovered. A follow-up pass is still
      needed for leg-to-body, height, FFMI/"too muscular", body symmetry,
      canthal tilt, and golden-ratio claims (open questions in that doc).
      **Seed scaffold:** backend now serves
      `backend/app/data/attractiveness_evidence.seed.json` at
      `/api/attractiveness-evidence`, validates goal/source/field references,
      and the goal builder shows matched evidence notes as reference-only or
      do-not-ship context. Human source/copy review is still required.

## 3. Measurement & Tracking Core

- [x] Measurement cadence tiers: frontend helper classifies each schema field
      as daily (weight), weekly (tape circumferences), monthly
      (slow-changing: height, head, wrist/frame widths); the account check-in
      loop shows only the due cadence buckets.
- [x] Quick daily log: single-field weight (and optional calories) entry that
      creates a lightweight account check-in, not a full snapshot.
- [x] Trend weight algorithm **(new)**: exponentially smoothed daily weight
      (Happy Scale/MacroFactor style) so daily fluctuation never reads as
      gain/loss; account check-ins now calculate trend weight, show raw dots
      vs smoothed line, and feed insight drops / weekly digest copy.
- [x] Ankle circumference field (needed for Casey Butt potential model):
      schema, target/persona dummy data, measuring guide, cadence tier,
      silhouette anchor, and schema drift tests updated.
- [x] Optional left/right split for limb fields **(new)**: bicep, forearm,
      thigh, calf enterable as L/R pairs in the local account check-in loop
      while the single measurement value stays the default for matching;
      dated limb-symmetry logs show side deltas and ride along in local
      check-in backups.
- [x] Richer longitudinal charts: snapshot history now includes a per-metric
      chart with all/90-day/180-day/1-year range selection, note annotation
      markers, and measurement-noise bands alongside the compact overview.
- [x] Per-field noise bands in trend charts **(new)**: snapshot trend charts
      shade typical tape/scale re-measurement error per field so users don't
      chase noise; reuses the noise model documented in
      `similarity-score-spec.md`.
- [x] Historical data import **(new)**: CSV import for weight history now
      accepts common date/weight/calorie/note exports, converts pounds when
      headers or unit columns label lb/lbs, skips duplicate daily dates, and
      stores imported rows as normal local daily check-ins. HealthKit
      historical weight remains native-app scope.
- [x] Encrypted local backup **(new)**: account panel can download and restore
      a passphrase-encrypted AES-GCM backup covering snapshots, check-ins,
      goals, protocols, procedures, workouts, and face metric logs. Photos are
      included as a metadata manifest only, not embedded image data.
- [x] Measurement how-to guides: backend serves dummy per-field guide copy and
      the browser renders selectable schematic instructions in the dense
      measurement form. The reviewable copy now lives in
      `backend/app/data/measurement_guides.seed.json`, with validation that
      every non-select schema field has exactly one guide.
- [x] Local browser face measurements **(new)**: copy the troontraits
      approach, not its source code - use MediaPipe Face Landmarker /
      `@mediapipe/tasks-vision` in-browser with a self-hosted model to collect
      face landmarks from live camera or uploaded photos. Primary use is
      measurement logging, not just live effects: store derived face metrics
      as dated local entries/snapshots, with clear uncertainty labels and no
      image upload. Candidate metrics: midface ratio, canthal tilt, facial
      thirds/fifths, eye spacing, lip ratio, gonial angle, cheekbone-to-jaw
      ratio, philtrum split, and fWHR. Add a side-profile research spike before
      implementation for sagittal/profile measurements, since MediaPipe's
      frontal face mesh is not enough for reliable nose/chin/jaw projection;
      evaluate browser-local 3D face reconstruction or profile-specific
      landmark models with permissive commercial licensing. **Implemented:**
      frontend now self-hosts the MediaPipe WASM/model assets, supports upload
      and live-camera face scans in the account panel, stores dated local metric
      records without image data, includes those records in progress reports,
      and provides a manual side-profile log for nasolabial angle,
      mentocervical angle, facial convexity, chin projection, or note-only
      entries while documenting the side-profile model spike in
      `face-measurement-research.md`.

## 4. Check-In Loop & Engagement

- [x] Weekly check-in flow: guided "what's due" entry session (cadence-driven),
      ends in a snapshot save and an insight drop.
- [x] Check-in streak with grace/freeze mechanic; weekly granularity, never
      daily for tape measurements.
- [x] Insight drops: after each check-in, surface real changes (trend deltas,
      tape deltas, active protocols, saved goals, and new comparisons
      unlocked).
- [x] "Your body tea" weekly digest **(new)**: a tea-toned summary of the
      week's data (trend, adherence, one notable insight); in-app first,
      notification/email later. The brand voice feature.
- [x] Milestones **(new)**: honest, goal-relative markers (first month
      tracked, 10 check-ins, measurement target reached). No fake urgency, no
      body judgment.
- [x] Check-in calendar heatmap **(new)**: GitHub-style consistency view of
      logging history.
- [ ] Notifications: web push + native push; framed as data decay ("trend
      going stale"), never body judgment; permission requested only at first
      snapshot save with a concrete promise. **First web pass:** the first
      successful Snapshot #1 save requests browser notification permission,
      stores a local notification preference, and an account-panel helper can
      send a once-per-day stale-trend reminder when permission is already
      granted. **Second web pass:** `frontend/public/trend-notification-worker.js`
      now registers after permission is granted and stale-trend reminders prefer
      service-worker `showNotification` delivery before falling back to the
      direct browser `Notification` API. **Third web pass:** backend now exposes
      `/api/web-push/config` plus strict subscribe/unsubscribe endpoints backed
      by SQLite, and the account panel can explicitly subscribe this browser
      only when notifications are already granted and VAPID settings are
      configured. **Fourth web pass:** subscribed browsers now send only a
      timestamp-only `nextReminderAfter` schedule, the backend tracks due
      stale-trend deliveries and last delivery status, and
      `backend/scripts/send_trend_push_reminders.py` can run from cron in
      dry-run or VAPID-send mode without reading measurements. **Native pass:**
      Capacitor runtimes can register native push tokens through
      `@capacitor/push-notifications`, store only the token envelope plus
      timestamp-only `nextReminderAfter` schedule on the backend, revoke by
      token hash, and a dry-runable native worker can send due reminders through
      FCM or APNs without reading measurements. Provider credentials and real
      device validation remain deployment work.

## 5. Protocol Tracker ("Build Plan" button)

- [x] Protocol log schema spec first: intervention taxonomy (aligned with
      corpus categories), dose/frequency fields, adherence scale, confounder
      fields (calories, sleep), start/end dates. Design for future
      trainability. Backend now serves dummy taxonomy metadata; **[human]**
      review of the taxonomy is still required before production.
- [x] Protocol CRUD: create a plan (one or more interventions + cadence),
      attach to goal, edit/archive.
- [x] Adherence check-ins: simple scale prompt during weekly check-in per
      active protocol.
- [x] Outcome attribution: snapshots taken during a protocol window are linked
      to it; per-protocol before/after measurement summary.
- [x] Defensible projections only: NIH/Hall energy-balance model for
      bodyweight/waist under a calorie target (public, validated,
      deterministic); novice/intermediate lean-mass gain shown as wide
      published ranges; everything else shows case logs, never curves.
      Local calorie-target protocols now use a documented Hall 2011
      linearized long-term body-weight equation port with adult age/PAL/fat-mass
      assumptions shown in the UI, uncertainty bands, and explicit caveats in
      `protocol-planning-notes.md`. The app still does not claim to be the full
      NIH Body Weight Planner early-phase glycogen/sodium model.
- [x] Projected-silhouette rendering for the defensible projections, using the
      existing SVG renderer, with explicit uncertainty copy.
- [x] Case logs: structured n=1 reports (protocol, adherence, before/after,
      timeframe, source) renderable from corpus entries and from the user's
      own completed protocols.
- [x] Goal system: target measurement set (pick a target profile or custom
      deltas), progress-toward-goal display, goal-relative framing everywhere
      ("4 cm from your target", never "below average"). **First pass:**
      saved local snapshots, backend target profiles, and custom deltas can
      now be used as target measurement sets with progress display; saved-goal
      rows show from-target / past-target / at-target framing.
- [x] Plan retro **(new)**: when a protocol ends, show predicted band vs
      actual outcome for the defensible projections. Closes the loop, builds
      trust, and labels the training data.
- [x] Post-procedure reliability flag **(confirmed, lightweight)**: a dated
      procedure/event annotation that marks affected measurements as
      unreliable for a healing window (swelling) and pauses trend inference
      for those fields. Ships as part of general life-event handling, not a
      procedure feature. Local reliability events now exclude affected daily
      weight logs from trend weight and hold affected weekly tape deltas during
      the pause window.
- [x] Full procedure tracking **(new)**: surgeries, fillers, piercings,
      tattoos, jaw/profile procedures, body contouring, and hair restoration
      now have a backend dummy taxonomy at `/api/procedure-library`, local
      account-scoped procedure logs, healing timelines, photo stream hints,
      generated reliability events for affected fields, backup/export/share
      inclusion, and progress-report case-log output. Production taxonomy and
      clinical/body-mod review remain human-gated.
- [x] Life-event modes **(new)**: pregnancy/postpartum, injury, illness —
      pause goals and fat-change inference, annotate the trend timeline.
      Matters for the female demo and for honest data. Local event
      annotations exist for procedure, postpartum, injury, and illness;
      affected-field trend pausing works, and saved goals pause while active
      reliability windows affect their target metrics.

## 6. Targets & Comparison

- [ ] Production target library per `target-profile-curation.md` +
      `target-profiles-template.json`: scope, estimation method, uncertainty
      labels, named-person policy. **[human]** — this is curation.
- [x] Target filtering UI (by source type, sex, build) as the library grows.
- [x] Measurement-band diff: upgrade overlap mode from silhouette overlay to
      per-region band diff showing where and how much bodies differ (decision
      flagged in `site-implementation-plan.md` — resolve it as: build it).
- [x] Comparison rendering variants and silhouette QA across more real-world
      body shapes (incl. extreme valid values): side-by-side, overlap, morph,
      and target-diff paths are covered, with 10 schema-complete QA profiles
      exercised through Node projection/comparison tests and the browser form.
- [x] Side-view silhouette **(new)**: second deterministic projection now
      estimates profile depth from circumference relative to available width,
      shares the front/side toggle across result/comparison/account views, and
      is covered by unit and browser tests. It remains an estimated projection,
      not camera-measured depth.
- [x] Past self as target **(confirmed)**: any saved snapshot usable as a
      match/comparison target — enables "maintain" and "return to form" goals
      with zero new data requirements.
- [x] Maintenance drift alerts **(new)**: saved goals now show local
      maintenance-band alerts after a target-band snapshot exists and the
      current measurement drifts outside the band, e.g. waist drifted +3 cm
      outside the maintenance range.
- [x] Silhouette morph animation **(new)**: interpolate measurements between
      current and target/projection with the existing renderer; use in-app
      and in share cards. High visual payoff for low engineering cost.

## 7. Insights & Calculators

- [x] FFMI calculator with natural-ceiling context: result summary now shows
      FFMI, normalized FFMI, lean mass, and non-diagnostic natural-ceiling
      context.
- [x] Casey Butt natural-potential model: male-only frame estimate uses height,
      wrist, ankle, and estimated body fat; labeled as planning context only.
      Target-silhouette rendering remains covered by the projection backlog.
- [x] Body-fat estimation, multi-method: Navy formula + RFM are shown
      alongside the averaged estimate and labeled as formulas, not diagnostics.
- [x] Gender score expansion: signed score now includes raw and derived
      metrics including SWR, WHR, WHTR, FFMI, and wrist/ankle frame index;
      methodology copy says this is measurement-pattern comparison only, not
      identity inference or medical advice.
- [x] Adaptive TDEE engine **(new)**: estimate true energy expenditure from
      logged weights + logged calories over time. Account check-ins now show a
      local adaptive kcal/day estimate with confidence bands after enough
      reliable daily weight+calorie logs; reliability-window exclusions are
      respected.
- [x] Cycle-aware tracking **(new)**: optional menstrual-cycle phase logging
      so weight/waist trend interpretation can flag cycle-correlated
      fluctuation instead of reading it as fat change. Strictly local-first,
      off by default, exportable/deletable — implemented as account-scoped
      local check-ins with encrypted-backup inclusion and a dedicated delete
      action for cycle logs.
- [x] Clothing size mapping **(confirmed)**: generic placeholder measurements
      to US/EU/UK garment sizes (pants, shirts, dresses; hat from head
      circumference; weak ring proxy from wrist circumference) now renders in
      the Result tab with backend dummy tables and helper tests. Brand-level
      source-reviewed tables remain later.
- [ ] Virtual try-on: parked **(new)**. Image-edit try-on is viable only via
      hosted APIs (~$0.02-0.08/image — workable later as a metered Pro
      feature); browser-local image editing (transformers.js/WebGPU) cannot
      run quality try-on today — these are multi-GB diffusion models.
      Deliberately out of initial scope: it drifts toward a general styling
      app. Sequence if demand shows: size mapping → fit-focused clothing
      recommendations → API try-on.
- [x] Waist-to-height ratio **(new)** in the ratio block: renders as WHTR
      with reference framing, not advice.
- [x] Bloodwork log **(new)** — **[human]** gate still required on production marker/range scope: manual
      lab-result entry (hormone panels, lipids, metabolic markers) with
      reference ranges, trend charts, and protocol linkage; informational
      display only. Liability posture: ship strictly local-only. Consumer
      apps are not HIPAA-covered entities; the real exposure (FTC health-data
      enforcement, state laws like Washington My Health My Data) attaches to
      health data a business *holds* — if labs never leave the device, there
      is nothing to hold or breach. Excluded from server sync v1; if synced
      later, only inside client-side-encrypted blobs the server cannot read.
      Serves TRT-curious lifters, transition users tracking HRT labs, and
      biohackers simultaneously.
      **Implemented:** strictly local-only scaffold with backend dummy marker
      library at `/api/bloodwork-library`, account-scoped manual lab-result
      entry, hormone/lipid/metabolic/thyroid/inflammation marker seeds,
      reference-range status, trend sparklines, protocol linkage, readable
      export, encrypted backup/restore, and local progress report inclusion.
      Bloodwork is excluded from server share dashboards and sync.
- [ ] Genome import: parked **(new)**. On-vision but the heaviest regulatory
      surface in the app (GINA, state genetic-privacy laws,
      post-23andMe-bankruptcy scrutiny). If ever: parsed and stored on-device
      only, never synced. Revisit only with **[human]** legal review, not
      before accounts/sync are stable.
- [x] Local AI "explain my data" assistant scaffold **(new)**: account panel
      Pro preview now builds a browser-local, deterministic explanation from
      the user's saved measurements, snapshots, goals, protocols, check-ins,
      workouts, local-only labs, photos, and face metric logs. It cites matched
      strategy corpus entries as context only, keeps account emails/IDs and
      private notes out of generated responses, and applies a hard boundary for
      dosing, prescribing, diagnosis, and medical instructions. Production AI
      provider/model selection, true Pro gating, and final prompt-boundary copy
      remain **[human]** review before ship.

## 8. Diet

- [x] Goal-derived macro targets: formula TDEE estimate plus selectable goal
      rate now produces daily calorie/protein/carb/fat targets, and the log
      view shows targets vs actuals. Adaptive engine remains later.
- [x] Custom foods + recents + favorites: Diet now stores custom food rows,
      recent foods, and favorite foods locally so repeat logs do not require a
      fresh search.
- [x] Meals/recipes: save multi-food combos as local meal templates, log them
      in one tap, and copy the latest logged day.
- [x] USDA FoodData Central as a second lookup source **(new)**: backend
      now serves dummy FDC-style generic foods and Diet merges them with Open
      Food Facts results. The dummy rows now live in
      `backend/app/data/food_usda.seed.json`, with validation for duplicate
      IDs/FDC IDs, search keywords, required macro/micronutrient keys, and
      nonnegative nutrient values.
- [ ] Production FDC import/API pipeline, API-key decision, and nutrient
      validation. **[human]**
- [x] Water/fluid logging **(new)**: Diet has local fluid entries, quick ml
      presets, manual labels, and target-vs-actual progress.
- [x] Micronutrient panel expansion beyond the current five, with %-of-target
      display: Diet now tracks fiber, sugar, sodium, potassium, calcium, iron,
      magnesium, zinc, vitamin C, vitamin D, and B12 with goal/limit rows and
      optional custom-food inputs.
- [x] Diet day import **(new)**: Diet accepts pasted or file CSV exports with
      flexible MFP/Cronometer-style date, meal, food, macro, and micronutrient
      headers, skips duplicate food rows, and stores imported rows as normal
      local diet log entries. HealthKit nutrition read/write remains native
      scope.

## 9. Workout Logger (offer, don't win)

Decision: include a deliberately commodity workout logger — not to beat
Hevy/Strong, but so users who don't already have a logger never need a second
app, and so exercise suggestions tied to aesthetic goals have somewhere to
land. No social features, no marketplace.

- [x] Exercise database seed scaffold: backend serves dummy validation
      exercises tagged by muscle group, equipment, difficulty, risk notes, and
      measurement target. The seed now lives in
      `backend/app/data/exercises.seed.json`, validates measurement-field and
      exercise references at load time, and exposes per-exercise
      instructions/source-review notes in the account workspace. Production
      still needs replacement with an open-licensed dataset such as wger or
      free-exercise-db.
- [x] Aesthetics→exercise mapping: target measurement deltas → muscle groups
      → suggested exercises/programs, with conservative training-level copy.
- [x] Session logger: local-first sets/reps/load/RPE/notes with quick-repeat of
      the latest session.
- [x] Program templates: seeded upper/lower and shape-recomp templates wired
      into goal-specific workout discovery.
- [x] PR tracking and per-lift history charts: local sessions now produce
      per-exercise best load/volume summaries and compact progression charts.
- [x] HealthKit/Health Connect workout write-back scaffold **(new)**:
      frontend now builds a local native-health write preview for logged
      strength sessions without notes, account IDs, or private labels. Actual
      HealthKit / Health Connect plugin writes remain native-project scope in
      section 16.

## 10. Photos

- [x] Local-only progress photos: account-scoped capture/import stored in this
      browser, with a dated gallery. Launch-decision photo gate still needs
      **[human]** review before production.
- [x] Pose/alignment ghost overlay at capture/import using a previous stream
      photo as the framing reference.
- [x] Photo comparison slider (before/after wipe) and photo-beside-silhouette
      view.
- [x] Photo categories **(new)**: body / face / hair streams in the gallery
      with per-category ghost overlays; face and hair streams serve the
      looksmaxxing and glow-up audiences without any inference.
- [x] Day-0 photo step in onboarding, framed as commitment, never measurement.
- [ ] ML measurement estimation: parked indefinitely — licensing is the
      blocker (Sapiens2 biometric restriction noted in README; SMPL-family
      needs commercial licenses). Revisit only with **[human]** legal review.

## 11. Onboarding & First Run

- [x] Goal question (one tap): Build muscle / Lose fat / Change shape / Track
      transition / Just curious → sets default tab, copy tone, notification
      framing; stored as a local profile attribute.
- [x] Core-five progressive flow: sex, height, weight, waist, bideltoid; one
      field per screen on mobile; instant payoff screen (silhouette + top
      match + two percentiles) in under 60 seconds.
- [x] Completion meter: remaining fields are optional forever; each added
      field states what it unlocks (WHR, better matching, etc.).
- [x] First snapshot framed as streak start ("Snapshot #1 saved. Next
      check-in: <date>"); notification permission asked here only.
- [x] Demo mode: "explore with a sample profile" on the first screen.
- [x] Dense form retained as the post-onboarding power-user editing surface.
- [x] Persona walkthrough seed file **(new)**: backend planning data now lives
      in `backend/app/data/planning.seed.json` with 10 validation personas,
      goal presets, protocol templates, and loader/curation checks for
      dangling persona-goal and goal-protocol references.

## 12. Brand & Theming

- [ ] Name decision: "Body Cafe" (working) — domain, trademark, and App Store
      search-collision checks before committing. **[human]**
- [ ] Rebrand pass once decided: wordmark, app icons, store assets, README,
      meta tags, share-card branding.
- [x] Warm "cafe" theme as default (see Infrastructure item 1), graphite as
      toggle.
- [x] Silhouette restyle: illustrated line-art treatment to match the warm
      theme (renderer geometry unchanged, stroke/fill treatment themed).
- [ ] Copy/tone pass: competence + non-judgment; "check-in"/"log", never
      "cheat" or moralized food language; tea-voice for insights. **[human]**
      final voice review. First automated guardrail is in:
      `frontend/src/lib/toneGuard.js` defines blocked moralized food/body
      phrases, `frontend/tests/toneGuard.node.mjs` scans app/content surfaces,
      and the weekly digest test preserves the "Tea:" voice.

## 13. Sharing & Growth

- [x] Shareable result card: rendered image export (silhouette + key stats +
      percentiles + branding), theme-aware, Pinterest-friendly aspect ratios.
      The acquisition loop — screenshots in Discords/group chats.
- [ ] Share URL decision: keep encoded-measurement URLs or move to server-side
      opaque snapshot IDs with expiry (open gate in
      `launch-decision-record.md`). **[human]** decision, agent implementation.
- [x] Marketing/landing site **(new)**: separate lightweight public page —
      what it is, privacy stance, screenshots, app-store links, Pro waitlist
      email capture.
- [x] Public methodology page **(new)**: `frontend/public/methodology.html`
      renders scoring, similarity, percentile-source, gender-score, and
      privacy methodology as an indexable public route.
- [x] Public measurement how-to guide pages **(new)**: every backend guide
      field is rendered as an indexable route under
      `frontend/public/measurement-guides/`, with a guide index and drift tests
      against the shared measurement schema.
- [ ] Replace schematic/dummy public guide copy with reviewed public
      illustrations and wording. **[human]**
- [x] PDF progress report **(new)**: printable summary of trends,
      measurements, and protocol adherence — for trainers and doctors;
      endocrinologist visits are a recurring real use for the transition
      audience.
- [x] Read-only share dashboard **(new)**: opt-in, revocable server-side live
      view of selected trends for a coach or partner. Implemented as a
      FastAPI/SQLite share-dashboard API with opaque public tokens and private
      revoke tokens, plus signed-in account-panel publish/update/copy/revoke
      controls and a `?share=` read-only public dashboard. The header encoded
      measurement URL remains available pending the final launch share decision.
- [x] Honest referral **(new)**: both sides get a Pro month; never gates
      features or results behind inviting. Implemented as a local-only
      scaffold in the account panel: stable invite codes, friend-code logging,
      future Pro-credit records, backup/export portability, entitlement config
      metadata, and tests proving current tools remain non-gated.
- [ ] Privacy-first product analytics: self-hosted PostHog or Plausible;
      event minimization; measurement values never in payloads (resolves the
      open analytics gate). **[human]** provider/hosting decision.
      Agent wiring is in place: existing local UI usage events now also map to
      a minimized first-party `POST /api/product-analytics` envelope with
      allowlisted event names, sanitized routes, anonymous session IDs, no
      arbitrary properties, no measurement values, disabled-by-default upload,
      SQLite storage, and frontend/backend privacy tests. External provider
      selection and production enablement remain open.

## 14. Accounts, Sync & Multi-Profile

- [ ] Accounts (email magic-link; no passwords, no social login requirement);
      local-first remains the default — accounts are opt-in for sync.
      First backend identity scaffold is in: `/api/accounts/magic-links`
      creates one-time magic-link requests, `/api/accounts/magic-links/verify`
      issues hash-stored sessions, `/api/accounts/session` reads the bearer
      session, and `/api/accounts/logout` revokes it. The account panel exposes
      a magic-link identity preview that sends only email/display-name/user-agent
      metadata and keeps measurements/logs local unless encrypted sync is used.
      A generic SMTP delivery scaffold can email a clickable
      `magicLinkToken` URL while keeping the login token out of the JSON
      response, and the frontend opens/scrubs those email-link URLs. Production
      email provider approval, account recovery, and identity-linked production
      automatic sync remain open.
- [x] Encrypted sync prototype: client-side-encrypted blob sync so the server cannot
      read measurements (the data-custody story the trans audience and
      cycle-tracking feature demand). **First backend scaffold:** FastAPI now
      exposes `/api/sync-vaults` create/read/update/revoke endpoints backed by
      SQLite, storing only opaque AES-GCM backup blobs, hashed sync tokens,
      device IDs, and revision metadata. `frontend/src/lib/encryptedSync.js`
      converts the existing encrypted local backup format into that sync blob
      and helper tests assert that emails, notes, and measurement keys are not
      sent in request bodies. The account panel now exposes manual create,
      push, pull, merge-and-push, force-push, and revoke controls; Playwright
      covers a no-backend-cheating restore into a second browser-local account.
      A first opt-in automatic sync preview reuses the same browser-held vault
      token and in-memory passphrase to run client-side merge-and-push checks
      after local log changes or focus/interval checks without storing the
      passphrase or sending plaintext measurements.
      Production identity and recovery are still open.
- [x] Cross-device restore + conflict handling prototype (last-write-wins per
      snapshot is fine v1). The sync-vault scaffold returns `409` on stale
      revisions and supports explicit force overwrites from the account panel.
      The manual merge-and-push flow pulls the remote encrypted vault,
      decrypts locally, unions remote-only and local-only backup records by ID,
      restores missing remote records into the active profile, and pushes the
      merged encrypted blob at the remote revision. A browser-local automatic
      sync preview can run that same merge-and-push path when enabled.
      Production account recovery and provider-backed background cross-device
      history remain open.
- [ ] Multi-profile **(new)**: household/coach use; profiles are separate
      encrypted stores.
      - First browser-local pass is in: the account panel now lists local
        profiles with per-store counts and one-click switching across
        account-scoped goals, protocols, check-ins, workouts, procedures,
        labs, photos, and face metric logs. True client-side encrypted
        cross-device profile stores remain part of encrypted sync above.
- [x] Personal data API **(new)**: token-scoped read access to one's own data
      for the encrypted sync-vault prototype. FastAPI now issues read-only
      bearer tokens after sync-token proof-of-control, stores only access-token
      hashes, returns the opaque encrypted sync vault through
      `/api/personal-data/sync-vault`, and revokes tokens without exposing
      plaintext measurements. The account panel can issue, test, copy, and
      revoke tokens. Production email-account identity remains covered by the
      accounts item above.
- [x] JSON export stays forever, account or not (standing decision): account
      panel now offers a readable local JSON export before sign-in and after
      sign-in, with snapshots and local diet data always included and
      account-scoped logs included when signed in.

## 15. Monetization

- [x] Entitlement layer: free/pro flag wired through frontend + backend,
      defaulting everything current to free. Tier line = marginal cost: free
      gets all tracking/data entry; pro gets compute/curation features
      (projections, adaptive TDEE, AI assistant, aggregated insights,
      HealthKit auto-sync, multi-profile).
- [x] Pro waitlist email capture before the paywall exists.
- [ ] Stripe subscriptions (web) — monthly + annual only, never weekly.
      **[human]** for account/pricing finals (~$6-8/mo, ~$40-50/yr working
      numbers).
- [ ] Apple IAP for iOS (required for digital goods; 15-30% cut); web
      checkout retained for web users.
- [x] Blurred-preview paywall treatment for pro insights (show that the
      insight exists; blur content; honest pricing page).
- [x] Never paywall the user's own historical data — encode as a test if
      possible (entitlement checks must not gate snapshot read paths).

## 16. Native Apps (Capacitor)

- [x] Capacitor web bootstrap wrapping the Vite build: `@capacitor/*`
      packages, `capacitor.config.json`, native add/open/sync package scripts,
      Vite `dist/` as the sync target, and backend `capacitor://localhost`
      CORS handling are in place.
- [ ] Generate and maintain Android/iOS Capacitor project folders once native
      toolchains and signing choices are available. This remains separate from
      the web bootstrap so repo verification does not depend on Xcode/Android
      Studio being installed in this workspace.
- [x] Native storage via the adapter (Preferences first): the default adapter
      switches to Capacitor Preferences in native runtimes, hydrates before
      first render, keeps synchronous readers backed by a native cache, and
      migrates existing `bodymod:` webview `localStorage` keys.
- [x] Native file storage for large photo/blob data: progress-photo imports now
      use `@capacitor/filesystem` in native runtimes, store image bytes under
      app data files, keep only photo metadata in the account JSON store, and
      hydrate/delete those assets through the account UI. SQLite is no longer
      required for this photo blob path.
- [x] Native barcode plugin (ML Kit) behind the existing manual-entry
      fallback: Capacitor runtimes use `@capacitor-mlkit/barcode-scanning`
      before the browser `BarcodeDetector` path, normalize scanned UPC/EAN
      values for Open Food Facts lookup, handle permission/module-install
      states, and keep manual entry available.
- [ ] HealthKit: weight read/write, measurement write, nutrition write;
      Google Fit / Health Connect equivalent on Android. First write-batch
      scaffold is in: `frontend/src/lib/healthSync.js` prepares HealthKit /
      Health Connect preview records for local weights, measurements, logged
      workouts, nutrition days, and fluid days; the account panel stores only
      metadata about the prepared batch. Native plugin selection, permission
      prompts, real device writes, and read/import flows remain pending
      generated native project folders.
- [ ] Push notifications (native), safe-area/status-bar/splash/icon polish,
      haptics on check-in save. Native push token registration/revocation and
      native check-in save haptics now exist. Safe-area CSS, native status-bar
      color/style setup, splash fade configuration, and web manifest/SVG icon
      polish now exist. APNs/FCM sender hooks now exist; production
      credentials/device validation remain.
- [ ] Home-screen widget **(new)**: streak + next check-in date (also helps
      App Review minimum-functionality). First payload scaffold is in:
      frontend now writes a measurement-free `bodymod:home-widget-snapshot:v1`
      record with streak status, next weekly check-in label/date, and daily-log
      status through the existing storage adapter, and the account panel shows
      a refreshable widget preview. Native iOS/Android widget extensions remain
      tied to generated project folders.
- [ ] JS live updates (e.g. Capgo) so web and app don't drift between binary
      reviews. First manifest scaffold is in: backend serves a review-gated
      live-update channel seed at `/api/live-updates/manifest`, the account
      panel can compare the running web/native shell version to that manifest,
      and the stored check state contains release metadata only. Production
      provider choice, bundle signing, staged rollout, rollback policy, and
      store-policy review remain pending.
- [ ] Automatic encrypted backup to iCloud/Google Drive **(new)** via native
      storage hooks; the local-first answer to "what if I lose my phone."
      First native file scaffold is in: `frontend/src/lib/nativeBackup.js`
      writes the existing AES-GCM backup JSON to Capacitor Filesystem, tracks
      metadata/autosave state through the storage adapter, and the account
      panel exposes save/restore/delete plus session autosave controls.
      Real iCloud/Google Drive policy and app-group/shared-storage wiring
      remain tied to generated native project folders.
- [ ] macOS CI lane (GitHub Actions + fastlane) for build/sign/upload;
      **[human]**: Apple Developer account ($99/yr), signing setup.
- [ ] App Store content strategy for the corpus: trimmed pharma categories on
      iOS vs full depth web-only; 17+ rating either way. **[human]** decision
      before first submission.

## 17. Strategy Corpus & Case Logs

- [ ] Corpus v1 curation: 2-3 outcomes, 15-20 sourced entries each, per
      `strategy-corpus-curation.md` rubric — evidence/risk/reversibility
      scores, legal notes, exclusions. **[human]** — this is the moat and it
      is manual.
- [x] Corpus backend migration: curated corpus seed moved from frontend-only
      local seed to backend-served data with review status, source metadata,
      versioned payload, and validation; frontend import/localStorage override
      remains for drafting and reset returns to the backend seed when loaded.
- [x] Admin curation tool **(new)**: minimal internal CRUD UI (or structured
      git workflow) for corpus entries, targets, and case logs with validation
      against the templates — beats hand-editing JSON/Python for every entry.
      Implemented as a structured git workflow: editable target/corpus JSON
      seeds and templates validate through `backend/scripts/validate_curation.py`,
      and `verify.ps1` runs the validator before frontend checks.
- [x] Case-log content type linked from corpus entries (schema shared with
      the protocol tracker's completed protocols). Backend corpus seed now
      carries dummy completed-protocol case logs linked by `caseLogIds`; the
      strategy detail UI renders them with n=1 limitations, import/export
      preserves them, and backend/Node/browser tests cover the content type.
- [x] High-risk display friction: corpus entries flagged
      surgical/pharma/medical-adjacent get an extra acknowledgment step and
      are excluded from any personalization.
- [ ] User-submitted case logs with moderation queue — explicitly last, after
      corpus v1 proves the content model. **[human]** moderation policy.

## 18. Compliance, Trust & Launch

- [x] Draft ToS, privacy policy, and medical disclaimer pages:
      `frontend/public/legal/` now contains review-ready static draft pages.
- [ ] Human/legal review and final ownership details for ToS, privacy policy,
      and medical disclaimer pages. **[human]**
- [x] Age gate (18+) before corpus content, stored locally per browser.
- [ ] Store rating set accordingly before native submission. **[human]**
- [x] Methodology page: scoring, similarity, percentile sources, gender score
      math — public and indexable (trust + SEO).
- [x] Accessibility pass **(new)**: keyboard navigation, contrast in both
      themes, screen-reader flows for the form and charts (builds on the
      existing ARIA/anchor work). Implemented with skip-to-main focus,
      Escape-to-close dialogs, visible focus rings, live status regions,
      form error associations, SVG chart titles/descriptions, and contrast
      tests for cafe/graphite theme tokens.
- [x] Deployment hardening beyond `deployment.md`: HTTPS, rate limiting on
      `/api/match`, dependency pinning/updates, backup strategy for the
      backend DB. Implemented configurable in-process `/api/match` rate
      limiting with tests; deployment notes now cover TLS/proxy handling,
      exact-pinned dependency update flow, and SQLite backup/restore handling.
- [ ] Launch checklist run: `verify.ps1`, screenshot review, fresh-profile
      share-link behavior, privacy copy — per `launch-decision-record.md`,
      with every open gate in that file resolved. **[human]** for the gate
      decisions.

## Open Decisions Queue (human, blocking the marked items)

1. Name commit: Body Cafe (trademark/domain/store check first).
2. Share URLs: encoded payload vs server-side IDs.
3. Analytics provider + hosting.
4. Photo gate revision: approve local-only capture.
5. App Store corpus strategy: trimmed iOS corpus vs web-only depth.
6. Pricing finals + Stripe/Apple accounts.
7. Named real-person/fictional targets policy.
8. Corpus v1 outcome picks + entry approvals.
9. Protocol taxonomy review.
10. Apple Developer account + signing.
11. Bloodwork scope: confirm strictly-local-only stance and whether labs ever
    sync (E2E-encrypted only if so).
12. Genome: confirm parked status.
13. Attractiveness evidence base: approve the research pass and review the
    resulting goal presets before they ship.
