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

- [ ] Theme system: refactor `frontend/src/styles.css` onto CSS custom
      properties with two themes — "cafe" (new warm default: paper/cream base,
      terracotta/clay/sage accents, rounded geometry) and "graphite" (current
      dark system), user-toggleable, persisted locally.
- [x] Storage adapter: frontend persistence now goes through
      `frontend/src/lib/storageAdapter.js`, which exposes async adapter methods
      for web `localStorage` and a memory test adapter while preserving the
      current synchronous UI helpers until native storage lands.
- [ ] Decompose `App.jsx` (~500 lines): extract state into hooks/contexts per
      domain (measurements, snapshots, comparison, units) before the feature
      wave makes it worse.
- [x] Backend database migration: targets now seed from
      `backend/app/data/targets.seed.json` into SQLite via
      `backend/app/repositories.py`, keeping current API shapes and tests
      green. Corpus/case-log backend migration remains tracked in section 17.
- [x] CI: GitHub Actions now runs `verify.ps1` on push/PR via
      `.github/workflows/verify.yml`, covering pytest, Node tests, build,
      Playwright, and screenshot capture.
- [ ] Error monitoring decision + wiring (privacy-conscious, e.g. self-hosted
      Sentry/GlitchTip; no measurement values in payloads). **[human]** for the
      provider decision, agent for the wiring.
- [ ] Schema single-source: generate the frontend field/bounds table and the
      Pydantic model from one schema definition (the drift test stays as a
      backstop). Already suggested in `site-implementation-plan.md`.
- [ ] i18n groundwork **(new)**: extract user-facing strings behind a
      lightweight i18n layer now, while the copy surface is small;
      translations come later.

## 2. Reference Data & Scoring

- [ ] ANSUR II ingestion: download, map fields to the measurement schema, unit
      conversion, build sex-specific empirical percentile tables; replace
      `backend/app/data/reference.py` scaffold; follow
      `reference-data-curation.md`; document source/license/methodology.
- [ ] NHANES supplement for general-US height/weight/waist (ANSUR is a
      military population; show both labels honestly).
- [ ] Replace population-panel scatter/distribution scaffold values with the
      vetted tables; update copy and reference labels.
- [ ] Sex-specific percentile output for every schema field the data supports
      (currently only height/waist/bideltoid).
- [ ] Calibrated similarity score per `similarity-score-spec.md` (mapping,
      API field, frontend display, calibration script, tests).
- [ ] Recalibrate scoring weights once real target data exists. **[human]**
      sign-off on weight changes.
- [ ] Configurable match priorities: user weighting presets ("prioritize
      shoulders", "prioritize waist/hip") applied to scoring (from
      `body-modding-platform-plan.md`).
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
- [ ] Optional left/right split for limb fields **(new)**: bicep, forearm,
      thigh, calf enterable as L/R pairs (single value stays the default);
      symmetry tracking for physique users.
- [ ] Richer longitudinal charts: per-metric history charts with range
      selection, annotations from snapshot notes (extends the compact trend
      chart).
- [x] Per-field noise bands in trend charts **(new)**: snapshot trend charts
      shade typical tape/scale re-measurement error per field so users don't
      chase noise; reuses the noise model documented in
      `similarity-score-spec.md`.
- [ ] Historical data import **(new)**: CSV import for weight history (Happy
      Scale, Libra, MFP export formats) and HealthKit historical weight once
      native ships. Instant value for switchers and the strongest lock-in
      moment in the funnel.
- [ ] Encrypted local backup **(new)**: passphrase-encrypted export file
      (snapshots + logs + photos manifest) for the privacy-conscious; restores
      on any device.
- [x] Measurement how-to guides: backend serves dummy per-field guide copy and
      the browser renders selectable schematic instructions in the dense
      measurement form. **[human]** still needed for final illustration
      direction before public SEO reuse.
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
      and documents the side-profile spike in `face-measurement-research.md`.

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
      snapshot save with a concrete promise.

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
- [ ] Defensible projections only: NIH/Hall energy-balance model for
      bodyweight/waist under a calorie target (public, validated,
      deterministic); novice/intermediate lean-mass gain shown as wide
      published ranges; everything else shows case logs, never curves.
      **First pass:** local calorie-target protocols show a conservative
      NIDDK/Hall-inspired planning band with explicit caveats in
      `protocol-planning-notes.md`; exact equation-port remains open.
- [x] Projected-silhouette rendering for the defensible projections, using the
      existing SVG renderer, with explicit uncertainty copy.
- [x] Case logs: structured n=1 reports (protocol, adherence, before/after,
      timeframe, source) renderable from corpus entries and from the user's
      own completed protocols.
- [ ] Goal system: target measurement set (pick a target profile or custom
      deltas), progress-toward-goal display, goal-relative framing everywhere
      ("4 cm from your target", never "below average"). **First pass:**
      saved local snapshots, backend target profiles, and custom deltas can
      now be used as target measurement sets with progress display; global
      framing remains open.
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
- [ ] Full procedure tracking: later **(new)**. Surgeries, fillers,
      piercings, tattoos as first-class intervention types with healing
      timelines, photo streams, and case-log output. Deferred until
      protocols + corpus are mature.
- [ ] Life-event modes **(new)**: pregnancy/postpartum, injury, illness —
      pause goals and fat-change inference, annotate the trend timeline.
      Matters for the female demo and for honest data. **First pass:** local
      event annotations exist for procedure, postpartum, injury, and illness;
      affected-field trend pausing now works; goal pausing remains open.

## 6. Targets & Comparison

- [ ] Production target library per `target-profile-curation.md` +
      `target-profiles-template.json`: scope, estimation method, uncertainty
      labels, named-person policy. **[human]** — this is curation.
- [x] Target filtering UI (by source type, sex, build) as the library grows.
- [x] Measurement-band diff: upgrade overlap mode from silhouette overlay to
      per-region band diff showing where and how much bodies differ (decision
      flagged in `site-implementation-plan.md` — resolve it as: build it).
- [ ] Comparison rendering variants and silhouette QA across more real-world
      body shapes (incl. extreme valid values).
- [ ] Side-view silhouette **(new)**: second deterministic projection
      (requires a depth-related field or estimation from circumference vs
      width); doubles comparison fidelity. Spec carefully before building.
- [x] Past self as target **(confirmed)**: any saved snapshot usable as a
      match/comparison target — enables "maintain" and "return to form" goals
      with zero new data requirements.
- [ ] Maintenance drift alerts **(new)**: at-goal users get band alerts
      ("waist drifted +3 cm over 6 months") instead of goal-progress framing;
      the honest retention mode for people who arrived.
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
- [ ] Cycle-aware tracking **(new)**: optional menstrual-cycle phase logging
      so weight/waist trend interpretation can flag cycle-correlated
      fluctuation instead of reading it as fat change. Strictly local-first,
      off by default, exportable/deletable — this is maximally sensitive data
      and a genuine differentiator for the female demo done right.
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
- [ ] Bloodwork log **(new)** — **[human]** gate on data scope: manual
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
- [ ] Genome import: parked **(new)**. On-vision but the heaviest regulatory
      surface in the app (GINA, state genetic-privacy laws,
      post-23andMe-bankruptcy scrutiny). If ever: parsed and stored on-device
      only, never synced. Revisit only with **[human]** legal review, not
      before accounts/sync are stable.
- [ ] AI "explain my data" assistant: answers questions about the user's own
      numbers, cites corpus entries, hard line against dosing/prescribing
      (boundary copy from `launch-decision-record.md`). Pro tier. **[human]**
      for prompt-boundary review before ship.

## 8. Diet

- [x] Goal-derived macro targets: formula TDEE estimate plus selectable goal
      rate now produces daily calorie/protein/carb/fat targets, and the log
      view shows targets vs actuals. Adaptive engine remains later.
- [x] Custom foods + recents + favorites: Diet now stores custom food rows,
      recent foods, and favorite foods locally so repeat logs do not require a
      fresh search.
- [x] Meals/recipes: save multi-food combos as local meal templates, log them
      in one tap, and copy the latest logged day.
- [ ] USDA FoodData Central as a second lookup source **(new)** (OFF is weak
      on US generic/raw foods; FDC is public domain).
- [x] Water/fluid logging **(new)**: Diet has local fluid entries, quick ml
      presets, manual labels, and target-vs-actual progress.
- [ ] Micronutrient panel expansion beyond the current five, with %-of-target
      display.
- [ ] Diet day import **(new)**: accept MFP/Cronometer CSV exports for
      switchers; HealthKit nutrition read/write once native ships.

## 9. Workout Logger (offer, don't win)

Decision: include a deliberately commodity workout logger — not to beat
Hevy/Strong, but so users who don't already have a logger never need a second
app, and so exercise suggestions tied to aesthetic goals have somewhere to
land. No social features, no marketplace.

- [x] Exercise database seed scaffold: backend serves dummy validation
      exercises tagged by muscle group, equipment, difficulty, risk notes, and
      measurement target. Production still needs replacement with an
      open-licensed dataset such as wger or free-exercise-db.
- [x] Aesthetics→exercise mapping: target measurement deltas → muscle groups
      → suggested exercises/programs, with conservative training-level copy.
- [x] Session logger: local-first sets/reps/load/RPE/notes with quick-repeat of
      the latest session.
- [x] Program templates: seeded upper/lower and shape-recomp templates wired
      into goal-specific workout discovery.
- [x] PR tracking and per-lift history charts: local sessions now produce
      per-exercise best load/volume summaries and compact progression charts.
- [ ] HealthKit/Health Connect workout write-back once native ships.

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

## 12. Brand & Theming

- [ ] Name decision: "Body Cafe" (working) — domain, trademark, and App Store
      search-collision checks before committing. **[human]**
- [ ] Rebrand pass once decided: wordmark, app icons, store assets, README,
      meta tags, share-card branding.
- [ ] Warm "cafe" theme as default (see Infrastructure item 1), graphite as
      toggle.
- [ ] Silhouette restyle: illustrated line-art treatment to match the warm
      theme (renderer geometry unchanged, stroke/fill treatment themed).
- [ ] Copy/tone pass: competence + non-judgment; "check-in"/"log", never
      "cheat" or moralized food language; tea-voice for insights. **[human]**
      final voice review.

## 13. Sharing & Growth

- [x] Shareable result card: rendered image export (silhouette + key stats +
      percentiles + branding), theme-aware, Pinterest-friendly aspect ratios.
      The acquisition loop — screenshots in Discords/group chats.
- [ ] Share URL decision: keep encoded-measurement URLs or move to server-side
      opaque snapshot IDs with expiry (open gate in
      `launch-decision-record.md`). **[human]** decision, agent implementation.
- [ ] Marketing/landing site **(new)**: separate lightweight public page —
      what it is, privacy stance, screenshots, app-store links, Pro waitlist
      email capture.
- [ ] Public SEO pages **(new)**: the measurement how-to guides and
      methodology pages rendered as indexable public routes; this niche
      searches "how to measure bideltoid" and nobody serves it well.
- [x] PDF progress report **(new)**: printable summary of trends,
      measurements, and protocol adherence — for trainers and doctors;
      endocrinologist visits are a recurring real use for the transition
      audience.
- [ ] Read-only share dashboard **(new)**: opt-in, revocable server-side live
      view of selected trends for a coach or partner. Depends on accounts and
      the share-URL decision.
- [ ] Honest referral **(new)**: both sides get a Pro month; never gates
      features or results behind inviting.
- [ ] Privacy-first product analytics: self-hosted PostHog or Plausible;
      event minimization; measurement values never in payloads (resolves the
      open analytics gate). **[human]** provider/hosting decision.

## 14. Accounts, Sync & Multi-Profile

- [ ] Accounts (email magic-link; no passwords, no social login requirement);
      local-first remains the default — accounts are opt-in for sync.
- [ ] Encrypted sync: client-side-encrypted blob sync so the server cannot
      read measurements (the data-custody story the trans audience and
      cycle-tracking feature demand).
- [ ] Cross-device restore + conflict handling (last-write-wins per snapshot
      is fine v1).
- [ ] Multi-profile **(new)**: household/coach use; profiles are separate
      encrypted stores.
- [ ] Personal data API **(new)**: token-scoped read access to one's own data
      once accounts exist; cheap to build, disproportionately loved by the
      quantified-self crowd.
- [ ] JSON export stays forever, account or not (standing decision).

## 15. Monetization

- [ ] Entitlement layer: free/pro flag wired through frontend + backend,
      defaulting everything current to free. Tier line = marginal cost: free
      gets all tracking/data entry; pro gets compute/curation features
      (projections, adaptive TDEE, AI assistant, aggregated insights,
      HealthKit auto-sync, multi-profile).
- [ ] Pro waitlist email capture before the paywall exists.
- [ ] Stripe subscriptions (web) — monthly + annual only, never weekly.
      **[human]** for account/pricing finals (~$6-8/mo, ~$40-50/yr working
      numbers).
- [ ] Apple IAP for iOS (required for digital goods; 15-30% cut); web
      checkout retained for web users.
- [ ] Blurred-preview paywall treatment for pro insights (show that the
      insight exists; blur content; honest pricing page).
- [ ] Never paywall the user's own historical data — encode as a test if
      possible (entitlement checks must not gate snapshot read paths).

## 16. Native Apps (Capacitor)

- [ ] Capacitor scaffold wrapping the Vite build; iOS + Android projects;
      `capacitor://localhost` added to CORS handling.
- [ ] Native storage via the adapter (Preferences/SQLite); migration from any
      existing webview localStorage.
- [ ] Native barcode plugin (ML Kit) behind the existing manual-entry
      fallback (BarcodeDetector doesn't exist in WKWebView).
- [ ] HealthKit: weight read/write, measurement write, nutrition write;
      Google Fit / Health Connect equivalent on Android.
- [ ] Push notifications (native), safe-area/status-bar/splash/icon polish,
      haptics on check-in save.
- [ ] Home-screen widget **(new)**: streak + next check-in date (also helps
      App Review minimum-functionality).
- [ ] JS live updates (e.g. Capgo) so web and app don't drift between binary
      reviews.
- [ ] Automatic encrypted backup to iCloud/Google Drive **(new)** via native
      storage hooks; the local-first answer to "what if I lose my phone."
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
- [ ] Corpus backend migration: curated corpus moves from local
      import/localStorage to backend storage with review status, source
      metadata, and version history; seed/import flow retained for drafting.
- [ ] Admin curation tool **(new)**: minimal internal CRUD UI (or structured
      git workflow) for corpus entries, targets, and case logs with validation
      against the templates — beats hand-editing JSON/Python for every entry.
- [ ] Case-log content type linked from corpus entries (schema shared with
      the protocol tracker's completed protocols).
- [ ] High-risk display friction: corpus entries flagged
      surgical/pharma/medical-adjacent get an extra acknowledgment step and
      are excluded from any personalization (existing decision, needs
      enforcement once corpus is real).
- [ ] User-submitted case logs with moderation queue — explicitly last, after
      corpus v1 proves the content model. **[human]** moderation policy.

## 18. Compliance, Trust & Launch

- [ ] ToS, privacy policy, and medical disclaimer pages. **[human]** review
      (template-based drafting is delegable).
- [ ] Age gate (17+/18+) before corpus content; store rating set accordingly.
- [ ] Methodology page: scoring, similarity, percentile sources, gender score
      math — public and indexable (trust + SEO).
- [ ] Accessibility pass **(new)**: keyboard navigation, contrast in both
      themes, screen-reader flows for the form and charts (builds on the
      existing ARIA/anchor work).
- [ ] Deployment hardening beyond `deployment.md`: HTTPS, rate limiting on
      `/api/match`, dependency pinning/updates, backup strategy for the
      backend DB.
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
