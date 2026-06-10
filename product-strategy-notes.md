# Product Strategy Notes

Planning notes covering feature direction, engagement mechanics, onboarding,
target demographics, iOS packaging, monetization, and delegation guidance.
Written 2026-06-09. These are recommendations, not decisions; decisions that
get adopted should graduate into `launch-decision-record.md` or
`mvp-build-spec.md`.

## Positioning Read

The repo today is a measurement tracker with a comparison engine. The vision
(fitness app + looksmaxxing + transhumanism) is served by three layers:

1. **Tracking core** (exists): measurements, snapshots, trends, diet. Table
   stakes; competitors are numerous; this layer earns retention, not
   acquisition.
2. **Insight layer** (partially exists): percentiles, ratios, similarity,
   gender score, forecasting. This is where the product becomes interesting
   and where most near-term engineering should go.
3. **Intervention layer** (seed only): the strategy corpus. Nobody else has a
   sourced, evidence-graded, outcome-indexed intervention database spanning
   training through pharma through surgical. This is the moat and it is
   curation-bound, not code-bound.

The wedge audiences (below) are measurement-first natives. The mass-market
fitness crowd is an ocean of competition; do not build toward them first.

## Target Demographics

In priority order:

1. **Measurement-driven lifters / recomp (men ~18-35).** Care about ratios,
   FFMI, "Greek ideal" proportions, natural-potential ceilings. Found via
   lifting YouTube/Reddit/Discord. Will pay for forecasting and plan tools.
   The current target/comparison features already speak to them.
2. **Gender-transition trackers.** HRT changes hip, waist, shoulder, and fat
   distribution over months — exactly what snapshot trends and the Gender tab
   measure. Underserved niche, intensely community-networked (tools spread by
   word of mouth), and the local-first/no-photos privacy stance is a genuine
   differentiator, not a compromise. The existing gender score view is already
   pointed here. Marketing and copy must be respectful and the data-custody
   story airtight.
3. **Women tracking recomp / "glow up" routines.** Large and real: the
   glow-up/body-recomposition content economy on TikTok and Pinterest is
   enormous, but the tracking happens in Notion templates, group chats, and
   screenshots rather than forums — the demand exists without a
   community-shaped tool serving it. Implications: the warm visual identity
   and tea-toned copy are the acquisition surface for this demo, and
   shareable/Pinterest-friendly result cards effectively *are* the community
   feature. Calorie tracking plus body tracking in one place is the hook.
4. **Looksmaxxing crowd.** Highest virality, highest toxicity and moderation
   cost. Body ratios land; the traffic magnet in this niche is face analysis,
   which is currently out of scope (photo, biometric licensing, dysmorphia
   risk). Let this audience arrive organically rather than building for them
   first.
5. **Physique competitors and quantified-self/biohackers.** Small, devoted,
   cheap to please (export, data depth — JSON export already exists).

Onboarding should fork copy by goal (see Intro Flow) so audiences 1 and 2 can
both be served without the copy alienating either.

Naming: rename direction is "Body Cafe" (working title; play on "body tea").
Rationale: "bodymod" collides with the piercing/implant subculture, and a
softer, more open name widens the funnel to women without costing the male
demo, who select on competence rather than aesthetics. Before committing:
domain and trademark search, and an App Store search-collision check (avoid
ranking next to recipe/cafe apps). The "tea" wordplay should carry into voice:
a weekly insight drop framed as "your body tea" is a retention feature with a
personality no competitor has.

## Visual Identity

Default theme moves warm: paper/cream base, terracotta-clay-sage accents,
rounded geometry, serif display type (the current wordmark is already serif),
illustrated line-art silhouette in place of the chrome wireframe, softened
data viz (filled areas, dotted grids). Keep the current dark system as a
"graphite" toggle so nothing is thrown away.

Implementation: refactor `frontend/src/styles.css` (one global file) onto CSS
custom properties with two themes. Well-scoped coding-agent task; do it before
the visual layer grows further.

Tone rules matter more than palette for the female demo: competence plus
non-judgment. "Check-in" and "log," never "cheat," never moralized food
language. The documented failure mode of incumbent trackers with women is
judgment, not darkness.

## Feature Roadmap (Recommended)

### Tier 1 — converts the toy into a habit

- **Real reference data.** ANSUR II (public, ~6k subjects, ~93 measurements,
  maps nearly 1:1 onto the schema) for measurement percentiles; NHANES for
  general-population height/weight/waist. Replaces the weakest numbers in the
  app. Highly agent-delegable with clear test rewards.
- **Calibrated similarity score.** Specced in `similarity-score-spec.md`.
- **Protocol tracker behind the existing "Build Plan" button.** Not a
  forecaster: outside a narrow slice, measurement projection has no honest
  data behind it, and a fake curve poisons trust in exactly the feature meant
  to build it. Structure instead as: plan = structured intervention log (what
  the user is doing, dose/frequency, from the corpus taxonomy where possible)
  → weekly adherence check-in (simple scale) → snapshot → outcome attached to
  protocol. Conveniently, this is the feature every wedge demo wants: program
  tracking for lifters, HRT timeline tracking for transition users, routine
  tracking for the glow-up crowd.

  Projection is offered only where defensible, clearly banded:
  - bodyweight/waist under a calorie target via the public, validated
    NIH/Hall energy-balance model (agent-implementable);
  - novice/intermediate lean-mass gain as wide published ranges;
  - everything else gets no curve — show **case logs** instead: structured
    n=1 reports (protocol, adherence, before/after measurements, timeframe),
    linkable from corpus entries.

  The critical design work is the **log schema**, not the model: intervention
  taxonomy, adherence scale, and basic confounders (calories, sleep) must be
  structured from v1, because that schema is what makes the accumulated data
  trainable later. The projection model is a v3 feature; the data flywheel
  starts at v1. Spec the schema before building the UI.
- **Weekly check-in loop.** Measurement reminder cadence, check-in streak
  (weekly, not daily — measurements change slowly and daily streaks would
  manufacture false precision), and an "insight drop" after each check-in
  (percentile movement, trend deltas, new comparison unlocked).
- **Shareable result card.** Rendered image export: silhouette + top stats +
  percentile, branded watermark. The acquisition loop for a tool like this is
  screenshots in Discord/Reddit; make the screenshot good.
- **Onboarding rework.** See Intro Flow.

### Tier 2 — deepens the moat

- **Natural-potential calculators.** FFMI, Casey Butt model (requires adding
  an ankle circumference field; wrist already exists). Render the user's
  "estimated natural ceiling" as a target silhouette. Beloved in audience 1,
  cheap to build.
- **Corpus v1.** Pick 2-3 outcomes (e.g. waist reduction, shoulder growth,
  fat redistribution) and curate 15-20 sourced entries each under the rubric
  in `strategy-corpus-curation.md`. Manual human work; the single highest
  long-term value item in this plan.
- **Goal-derived diet targets.** TDEE estimate + plan rate → daily macro
  targets vs. logged intake. Upgrades Diet from logging to feedback.
- **Workout logger (offer, don't win).** Deliberately commodity session
  logging on an open exercise database, differentiated only by the
  aesthetics→exercise mapping (target measurement deltas → muscle groups →
  exercises) and by auto-deriving protocol adherence from logged sessions.
  Exists so users never need a second app, not to beat the incumbents. Same
  table-stakes logic as Diet.
- **HealthKit / Google Fit sync** (with the native app): auto weight import,
  measurement write-back. Also the strongest answer to Apple's
  minimum-functionality rule.
- **Progress photos, local-only.** Currently gated off in
  `launch-decision-record.md`. Worth revisiting once a native app exists:
  photos stored on-device in the app container sidestep the server-custody
  problem, and photo-plus-measurement overlay is the most-requested feature
  class in every body-tracking product. Keep no-upload as the line.

### Tier 3 — requires accounts and/or moderation

- Accounts + cross-device sync (becomes necessary once the iOS app exists;
  design for minimal custody, ideally encrypted blobs the server cannot read).
- AI "explain my data" assistant: answers questions about the user's own
  numbers and cites corpus entries; never doses, never prescribes. The
  informational/advice line from `launch-decision-record.md` applies verbatim.
- Community: user-submitted protocols with review status, friend comparison.
  Large moderation cost; do not start before corpus v1 proves the content
  model.
- Face/photo analysis: the looksmaxxing traffic magnet and the highest-risk
  feature in the space (dysmorphia amplification, biometric-data law, model
  licensing, App Store scrutiny). If ever pursued, treat as its own product
  decision with legal review, possibly its own surface.

## Engagement Mechanics

The dominant apps in the adjacent niche (face-rating apps circa 2024-25) made
seven figures fast with: scan → blurred result → hard weekly-priced paywall →
invite-N-friends-to-unlock → re-scan ritual. That playbook works and is why
those apps also got review-bombed, churned hard, and became the press shorthand
for "insecurity as a service." This user base has elevated body-dysmorphia
prevalence; mechanics that monetize anxiety are both the most effective and
the most damaging option available. The recommendation: adopt the retention
mechanics that reward genuinely useful behavior, skip the anxiety engine —
on liability grounds (FTC dark-pattern enforcement, e.g. the Epic settlement;
EU dark-pattern rules incoming; Apple increasingly rejects manipulative
subscription flows) as much as ethical ones. Long-term LTV in tracking apps
comes from multi-year retention, which anxiety mechanics actively destroy.

Adopt:

- Weekly check-in streak with a grace/freeze mechanic (the single
  best-documented retention mechanic in consumer apps).
- Profile-completion meter where each added measurement visibly unlocks
  something real (accuracy, a ratio, a chart) — investment effect, honest here.
- Insight drops on check-in (variable reward keyed to real data changes).
- Re-engagement notifications framed as data decay ("3 weeks since last
  check-in — your trend line is going stale"), never as body judgment.
- Social proof in onboarding (profiles measured this week).
- Shareable cards with branding (acquisition loop).
- Blurred-preview paywall on premium insights: show that the insight exists,
  blur its content. Standard and acceptable; pair with honest pricing.
- Goal-relative framing everywhere: "4 cm from your target," not "below
  average." Same number, opposite valence, and the user chose the reference.

Avoid:

- Weekly-priced subscriptions (reads cheap, bills ~5x a monthly; chargeback
  and rejection magnet). Price monthly/annual.
- Invite-gates on core results.
- Fake urgency or scarcity (nothing in this product is scarce).
- Confirmshaming copy.
- Paywalling the user's own historical data (roach motel; generates support
  hell and refunds).
- Negative-comparison hooks ("your X is below average" as a notification or
  default frame). This is the line between tracking tool and insecurity
  engine, and it is also the thing regulators and journalists in this niche
  pattern-match on.

## Intro Flow

Current first-run lands on a ~20-field dense form. Replace with progressive
onboarding; target "first aha under 60 seconds":

1. **Goal question, one tap:** Build muscle / Lose fat / Change shape / Track
   transition / Just curious. Sets default tab, copy tone, and later
   notification framing; doubles as zero-cost segmentation.
2. **Core five:** sex, height, weight, waist, shoulder (bideltoid). One field
   per screen on mobile, big inputs, unit choice remembered.
3. **Payoff screen:** silhouette + top match + two percentiles immediately.
4. **Progressive refinement:** "Add 4 more measurements to unlock WHR + better
   matching" — completion meter; every additional field states what it
   unlocks. The remaining fields are optional forever.
5. **First snapshot framed as streak start:** "Snapshot #1 saved. Next
   check-in June 16." Ask notification permission here — after value delivery,
   attached to a concrete promise — never on load.
6. **Optional day-0 photo, framed as commitment, not measurement:** "Take
   your day-0 photo — it never leaves your device — then grab a tape
   measure." Photos cannot honestly measure (monocular scale ambiguity;
   reference-object tricks fail on camera distance and tilt), but a local
   progress photo with a pose/alignment ghost overlay is high retention value
   at zero inference risk. ML measurement-estimation from photos is a
   possible far-future Pro feature with explicit error bars (waist ±3-5 cm is
   the realistic ceiling); its real blocker is model licensing (Sapiens2's
   biometric restriction is already noted in the README; SMPL-family body
   models require paid commercial licenses). Requires revisiting the photo
   gate in `launch-decision-record.md` for local-only capture.
7. **Demo path:** "Explore with a sample profile" link on the first screen for
   the unconvinced.

The existing dense form remains as the power-user editing surface after
onboarding.

## iOS App (Keep the Webapp)

Recommendation: **Capacitor wrapping the existing Vite/React build.** One
codebase serves web, iOS, and (nearly free alongside) Android. Skip PWA as the
primary mobile strategy (no HealthKit, weak push, storage eviction, no store
presence). Skip a React Native rewrite (forks the codebase for little gain).

The wrap itself is days; production readiness is the real list:

1. **Storage migration (critical).** WKWebView `localStorage` is evictable
   cache, and snapshots are the user's entire data. Introduce a storage
   adapter behind `frontend/src/lib/storage.js` (already a single module —
   good) that uses Capacitor Preferences/SQLite natively and `localStorage`
   on web.
2. **Barcode scanning.** `BarcodeDetector` does not exist in WKWebView; slot a
   native plugin (e.g. ML Kit barcode Capacitor plugin) behind the existing
   manual-entry fallback.
3. **App Review, Guideline 4.2 (minimum functionality).** Bare web wrappers
   get rejected. Ship with at least HealthKit sync + native barcode + push;
   that comfortably clears the bar and HealthKit is independently the most
   iOS-native feature available to this product.
4. **App Review, Guideline 1.4 (physical harm) and content rating.** The
   strategy corpus is the rejection risk: compound/pharma-adjacent content is
   scrutinized far harder in the App Store than on the web. Options: ship the
   iOS corpus without pharma categories (full depth stays web-only), or
   strictly informational entries with sources and a 17+ rating. Set 17+
   regardless. Decide before submission, not after rejection.
5. **CORS/origins:** native app origin is `capacitor://localhost` — add to
   `BODYMOD_CORS_ORIGINS` handling.
6. **Windows dev constraint:** iOS cannot be built or simulated on Windows.
   Use a macOS CI runner (GitHub Actions + fastlane) for build/sign/upload, or
   a used Mac mini. Apple Developer Program is $99/yr. This is bureaucracy,
   not engineering, but it is the part agents cannot do alone.
7. **Update cadence:** web ships instantly; the iOS binary requires review per
   release. JS-level live updates (e.g. Capgo) are permitted for WebKit-served
   content and worth adding so web and app do not drift.
8. Polish: safe-area insets, status bar, splash screens, icons, haptics.

Net estimate: wrap + storage + barcode + HealthKit + store assets ≈ 2-3 weeks
of delegable work, plus Apple account/review latency. The standing cost is the
content-policy constraint on the corpus (item 4), which is strategic, not
technical.

## Monetization

Freemium, with the tier line drawn on marginal cost: **free = everything that
costs nothing per use** (measurement tracking, snapshots, diet logging, goals,
basic comparison — full MyFitnessPal-class utility, and all data entry lives
in the free tier so the user's history accumulates here); **pro = everything
that costs real compute or real curation per use** (projections, AI analyses,
face mapping if it ever ships, advanced analytics, insights derived from
aggregated internal data, HealthKit auto-sync, multiple profiles). This line
is easy to defend to users and to ourselves: the user's data is never the
product being sold back to them — the compute and the curation are.

Data gravity from a genuinely useful free tier is the retention strategy and
is not a dark pattern, with two conditions that keep it honest: JSON export
stays forever (it costs ~zero churn and buys outsized trust, especially with
the trans audience, who are rightly sensitive about body-data custody), and
the user's own historical data is never paywalled.

Pricing: ~$6-8/mo or ~$40-50/yr; never weekly. On iOS, digital subscriptions
must use Apple IAP (15-30% cut); keep web checkout for web users. Sequencing:
do not ship the subscription until at least one pro feature is genuinely worth
paying for — a "Pro coming" email-capture list beats a thin paywall.

Long-game data asset: the protocol tracker's structured logs (intervention +
adherence + measured outcomes), with accounts and explicit consent, become an
anonymized measurement-change-given-intervention dataset nobody has — both
the input to future projection models and a pro-tier insight source ("what
actually moved waists 5 cm"). Requires a consent framework and real privacy
engineering; the log schema is designed for it from v1, the dataset is built
much later.

## Compliance / Risk Register

- Body measurements + goals become health-adjacent special-category data the
  moment accounts exist (GDPR et al.). Local-first default is the shield;
  keep it the default even after accounts ship.
- Lab results and (if ever) genome data are a tier above measurements.
  Posture: strictly local-only at launch, excluded from v1 sync,
  client-side-encrypted blobs if synced later. Consumer apps sit outside
  HIPAA; the exposure (FTC health-data enforcement, state laws like
  Washington My Health My Data) attaches to health data the business
  *holds* — hold nothing. Genome stays parked pending legal review.
- 17+/18+ gating for corpus content; minors + body-image tooling is the
  regulatory third rail in every jurisdiction.
- Medical disclaimer + ToS before public launch (extends
  `launch-decision-record.md`).
- Analytics, if approved, should be privacy-first (self-hosted PostHog or
  Plausible); measurement values never leave the device as analytics payloads.
- The informational/advice boundary: describing what exists, with sources,
  without dosing/sourcing/personalized escalation, is the defensible position
  for the corpus. First-party published content carries publisher liability —
  the rubric in `strategy-corpus-curation.md` is the control.

## Delegation Guidance

Agent-friendly (clear spec, verifiable rewards via `verify.ps1`):
ANSUR/NHANES ingestion + percentile rewrite, similarity score
(`similarity-score-spec.md`), storage adapter, Capacitor wrap, share-card
renderer, calculators (FFMI/Casey Butt), plan-builder math, streak/check-in
mechanics, goal-derived macro targets.

Human-judgment-bound (do not delegate blind): corpus curation and exclusion
decisions, onboarding copy and goal-fork tone, pricing, App Store content
strategy for the corpus, naming decision, anything touching the
informational/advice line.
