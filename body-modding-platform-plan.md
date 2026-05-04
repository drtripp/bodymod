# Bodymod Product Plan

This document captures the broader roadmap. The current built product is smaller and more concrete than the original exploratory idea: it is a measurement-first comparison and local tracking tool.

## Current Product

Bodymod currently supports:

- expanded manual body measurement entry
- deterministic front-view SVG silhouette rendering
- backend target profile fetching
- scaffold match ranking against placeholder targets
- approximate adult-reference percentile output, explicitly labeled as not NHANES-calibrated
- local browser snapshots with labels, compare, export, import, load, and delete
- notes attached to snapshots
- compact local snapshot trend summary
- current-vs-prior snapshot silhouette comparison
- metric and imperial display controls
- side-by-side and overlap comparison against target profiles
- result, vs Target, and vs US Population panes are tabbed in the main workspace
- first-draft US population scatter and distribution plots
- method and privacy content collapsed into a hover footnote
- header share icon for encoded measurement links
- local-only usage event logging
- outcome-first informational strategy explorer opened as an overlay, with one efficacy/risk plot per desired outcome

The app does not currently support:

- accounts
- photo uploads
- AI analysis
- guidance or recommendation content
- community protocols
- production analytics
- source-reviewed strategy entries

## Product Principle

Keep the product useful as a private tool before adding public or social mechanics.

The app should first be good at:

- entering measurements without friction
- turning those measurements into a legible visual profile
- comparing against target profiles
- tracking changes over time on the same device

## Near-Term Roadmap

### 1. Complete The Comparison Workflow

Implemented:

- rendered comparison controls in the main page
- selected target state
- side-by-side comparison
- simple overlap comparison
- basic directionality copy
- separate vs Target and vs US Population tabs
- first-draft sex-colored US population scatter/distribution charts
- target type, placeholder notes, and largest score-driver bullets in the vs Target pane

Remaining work:

- visual QA across more body shapes and smaller screens
- decide whether overlap should remain a simple silhouette overlay or become a measurement-band diff
- replace population chart scaffold values with vetted reference tables

### 2. Improve Result Trust

Current scoring and percentiles are scaffold logic.

Planned work:

- replace placeholder percentile formulas with reference-population calculations
- improve target data quality
- keep scoring tests aligned with matching changes
- label estimated target profiles clearly

### 3. Make Local Tracking More Useful

Current snapshots can be saved, labeled, loaded, compared, exported, imported, and deleted.

Remaining work:

- richer longitudinal summaries
- trend charts
- richer trend charts if tracking becomes a core workflow

### 4. Add Basic Trust Pages

Method and privacy components are visible through header navigation.

Remaining work:

- revise copy when production analytics or server-side sharing decisions are made
- expand methodology once percentile and target data are production quality

### 5. Launch Layer

Only after the private-use loop works well:

- decide whether encoded measurement share URLs are acceptable for launch
- decide whether local-only analytics are enough or whether production analytics are justified
- harden deployment beyond the prototype notes in `deployment.md`
- larger target library

The current public-launch gates are captured in `launch-decision-record.md`.

## Future Feature Areas

These are candidates, not commitments.

### Expanded Target Library

- more fictional and real-person target profiles
- archetypes such as classic physique, swimmer, runner, or bodybuilder profiles
- better metadata and uncertainty labels
- optional target filtering

The target profile handoff rubric lives in `target-profile-curation.md`. The
starter import shape lives in `target-profiles-template.json`.

### Better Comparison Logic

Implemented in scaffold form:

- weighting by measurement importance
- ratio-aware scoring alongside absolute measurement distance

Remaining work:

- configurable match priorities
- clearer explanation of what differs most from a target

### Reference Data

- NHANES or another reference population for percentiles
- sex-specific percentile output
- ANSUR, NHANES, or equivalent-backed scatter/distribution plots
- age/race/ethnicity filtering only if the data and privacy stance justify it
- careful language that these are reference comparisons, not universal rankings

The replacement standard for production percentile data lives in
`reference-data-curation.md`.

### Strategy Information Corpus

This is a later manual research layer, not part of the current measurement MVP.

The concept is a structured corpus of unorthodox looksmaxxing, physique-modification, and biohacking strategies organized around desired outcomes. The product should inform users about what people attempt, what evidence exists, what risks are known, and how uncertain the claims are. It should not coach a user into doing something.

Candidate outcome categories:

- gain weight
- lose weight
- increase a body measurement
- decrease a body measurement
- change a ratio or proportion
- whiten teeth
- alter skin appearance
- alter hair density or presentation
- alter facial soft tissue
- alter perceived bone structure
- change posture or apparent frame
- recover, maintain, or preserve an aesthetic trait

Each outcome page could eventually contain an efficacy/risk grid:

- x-axis: estimated efficacy or magnitude of effect
- y-axis: estimated risk or downside severity
- plotted items: strategies, techniques, surgeries, devices, medications, supplements, habits, and cosmetic interventions
- visual encoding for evidence quality, reversibility, cost, time horizon, legal/medical sensitivity, and permanence

Each strategy entry should have structured fields:

- target outcome
- claimed mechanism
- evidence level
- expected magnitude range
- time horizon
- reversibility
- cost range
- risk profile
- contraindication flags
- legal or regulatory notes
- source links
- uncertainty notes
- moderation/review status

This corpus will likely be built manually first. The valuable work is taxonomy, source review, and careful framing, not automation.

The current app has only seed entries. Those entries are useful as UI scaffolding, but they are not source-reviewed. A production corpus needs a repeatable review workflow:

1. Define the outcome page and intervention category.
2. Add candidate strategy entries with neutral naming.
3. Record claimed mechanism, expected magnitude, time horizon, reversibility, cost, and permanence.
4. Add source links and classify source type.
5. Score efficacy, risk, and uncertainty separately.
6. Mark contraindication, legal/regulatory, surgical, pharmaceutical, and medical-adjacent flags.
7. Decide whether the entry can be shown generally, shown with stronger caution, or excluded entirely.
8. Confirm copy remains informational and does not become a protocol, dose, coaching path, or personalized recommendation.

The grid now starts with "desired outcome first" browsing because that matches user intent. Each outcome shows one efficacy/risk graph. Strategy dots open a synopsis modal, and the modal can open a dedicated strategy detail view. Intervention type remains useful as entry metadata and later safety-review filtering.

The current frontend can export the seed corpus as JSON, import a manually curated corpus JSON for review, persist that imported corpus locally, and reset back to the seed corpus. That is a curation scaffold, not a production content system. A later version should move curated corpus data into a controlled source of truth with review history, source metadata, and moderation decisions.

The manual review rubric lives in `strategy-corpus-curation.md`. The import
shape lives in `strategy-corpus-template.json`.

### Personal Tracking

- longitudinal change summaries
- simple progress charts
- richer notes and annotations attached to snapshots
- local export

### Shareability

Possible approaches:

- encoded measurement payload in URL
- server-side snapshot ID
- image export of silhouette and match summary

Privacy needs to be settled before this ships. Raw body measurements in URLs may be too sensitive for a default flow.

### Accounts

Accounts are not needed for the current app.

They may become useful later for:

- cross-device history
- longer-term backups
- private target libraries
- share management

Do not add accounts just to create a signup funnel.

### Photo-Assisted Measurement

Photo uploads are out of scope now.

A future version could explore client-side photo-assisted measurement, but this needs:

- privacy review
- model/license review
- careful biometric-processing analysis
- clear fallback to manual measurement entry

The current `inference.js` file is only a placeholder for possible future local inference work.

### Guidance Layer

Guidance is deliberately out of scope for the current product.

If the app earns further investment, possible informational directions include:

- general training emphasis categories
- measurement literacy
- non-prescriptive educational content
- links to external resources
- outcome-oriented strategy maps that compare efficacy, risk, uncertainty, reversibility, and cost

The line is important: the product may say "this category exists, these are the claimed effects, these are the known risks, and this is the evidence quality." It should not say "you should do this," generate protocols, personalize dosing, rank risky interventions as a best next step, or create a coaching loop.

Avoid procedural, compound, dosing, or medical-adjacent recommendations unless there is a separate legal and safety review.

### Community And Protocols

Community features are speculative and should wait until the private tool has traction.

Possible later ideas:

- user-submitted progress logs
- anonymized aggregate measurement changes
- protocol-style records with strong moderation

Risks:

- sensitive health-adjacent data
- survivorship bias
- moderation burden
- unsafe advice

## Monetization Thoughts

No monetization is planned for the current build.

Possible later paid features:

- cross-device sync
- larger private history
- richer comparison reports
- advanced target libraries

Keep core local tracking free if the product relies on repeat personal use.

## Open Questions

- Is the app primarily a private tracking tool or a shareable comparison hook?
- How much target data uncertainty should be visible in the UI?
- Is encoded URL sharing acceptable for sensitive measurement data?
- Which reference population is good enough for percentile output?
- Does the expanded measurement schema create too much entry friction?
- What is the minimum target library size that makes matches feel meaningful?
- Should the future strategy corpus be organized by desired outcome first, intervention type first, or both?
- What evidence scale is credible enough for niche strategies where formal research may be thin?
- How should the product display high-efficacy/high-risk interventions without glamorizing them?
- What content should be excluded entirely even if users search for it?

## Product Guardrails

- Keep manual measurement entry first-class.
- Avoid medical or intervention guidance.
- Avoid raw photo handling until privacy and licensing are solved.
- Prefer local-first storage.
- Label estimated and placeholder outputs plainly.
- Do not add accounts before they solve a real user problem.
- Separate informational content from personalized recommendations.
- Never produce dosing, procedural instructions, evasion guidance, or individualized risk-taking plans.
- Show evidence quality and uncertainty as first-class data, not footnotes.
- Treat medical, surgical, pharmaceutical, and legally sensitive strategies as high-review content.
