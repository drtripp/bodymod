# Body Modding Platform MVP

## Product Decision

This MVP is a measurement-driven comparison and tracking tool, not a guidance platform.

The build should optimize for two outcomes:

- It is usable and personally valuable even if nobody else shows up.
- It is simple enough to launch quickly and measure whether anyone actually wants it.

Anything that turns the product into a medical-adjacent recommendation engine stays out of the initial release.

## MVP Goal

Ship a public web app where a user can:

1. Enter a small set of body measurements.
2. See a generated front-view silhouette.
3. Compare that silhouette against a small curated target library.
4. Save measurements locally and come back later.

If outside users do not appear, the app should still work as a private self-tracking and comparison tool.

## Primary User

The first user is you, plus people like you: users who already think in terms of body shape, proportions, and target physiques, and who want a fast visual/measurement comparison tool more than a generic fitness app.

Do not optimize the first release for broad consumer onboarding. Optimize for a niche user who tolerates measurement entry in exchange for a better output.

## Success Criteria

Nominal traction means any of the following within the first few weeks after launch:

- A small number of returning users without direct prompting.
- Organic shares or direct links to specific comparison results.
- Repeat use by you for actual tracking rather than one-time curiosity.

Failure is not "few signups." Failure is "the tool is not useful enough for even one motivated user to keep using."

## Explicit Scope

### In Scope

- Measurement entry form
- Front-view parametric silhouette renderer
- Match scoring against a curated target dataset
- Side-by-side and overlap comparison modes
- Local persistence in browser storage
- Shareable result URL using encoded measurement payload or saved snapshot id
- Lightweight analytics for page views, completed inputs, and shares

### Out of Scope

- AI-generated guidance
- Procedure, compound, or dosing content
- Community protocols
- Accounts and authentication
- Raw photo uploads
- 3D rendering
- Large-scale dataset aggregation from users
- Character imagery
- Extensive personalization logic

## User Flow

### First Visit

1. Land on a simple page explaining the tool in one sentence.
2. Enter seven measurements plus sex.
3. Submit and immediately see:
   - personal silhouette
   - top match
   - ranked alternatives
   - percentile summary
   - toggle for side-by-side vs overlap
4. Optionally save locally for later comparison.
5. Optionally copy a share link.

### Return Visit

1. Measurements reload from local storage.
2. User can edit current stats or create a new dated snapshot.
3. User can compare current snapshot against a prior personal snapshot or a target physique.

## Core Features

### 1. Measurement Entry

Required fields:

- height
- weight
- sex
- shoulders
- underbust
- waist
- hips

Requirements:

- Single unit system shown by default with an obvious unit toggle if supported
- Inline measurement help text
- Validation for missing values and implausible ranges
- Mobile-friendly form layout

### 2. Silhouette Renderer

Requirements:

- SVG-based, not raster
- Front view only
- Deterministic output from measurement inputs
- Same renderer for users and targets
- Fast enough to update instantly on input change or submit

Quality bar:

- It does not need anatomical realism.
- It does need to look consistent, legible, and intentional.
- Small input changes should produce small visible changes.

### 3. Matching Engine

Requirements:

- Small curated target dataset in JSON
- Distance score over normalized measurements
- Return top 1 primary match plus top N alternatives
- Show enough explanation that the result does not feel arbitrary

Initial recommendation:

- Normalize by height where appropriate so the engine does not collapse into "closest body size wins."
- Keep the first scoring model simple and inspectable.
- Do not hide heuristic weighting behind fake precision.

### 4. Comparison View

Modes:

- Side-by-side
- Overlap diff

Requirements:

- Clear legend for growth vs shrink regions
- Accessible secondary signal beyond color alone
- Obvious explanation that the comparison is approximate

### 5. Local Tracking

Requirements:

- Save latest measurement set locally
- Support multiple dated snapshots
- Let the user compare a current snapshot against an older one

This is the part that makes the tool still valuable even with zero public adoption.

### 6. Shareability

Requirements:

- Copy-link button for current result
- Basic social preview metadata if feasible
- URL should recreate the result page without requiring login

If privacy concerns make raw measurements in the URL unacceptable, store a server-side snapshot id instead.

## Technical Decisions

### Recommended Stack

- `Next.js` for app shell and deployment simplicity
- `TypeScript`
- `SVG` rendering for silhouettes
- JSON files for target data
- Vercel or similar static/serverless host
- Plausible or PostHog for lightweight analytics

This is not because the stack is special. It is because it minimizes launch friction.

### Data Model

Use one canonical measurement schema everywhere:

```ts
type MeasurementSet = {
  height: number;
  weight: number;
  sex: "male" | "female";
  shoulders: number;
  underbust: number;
  waist: number;
  hips: number;
};
```

Target data should reuse the same schema plus metadata:

```ts
type TargetProfile = {
  id: string;
  label: string;
  sourceType: "character" | "actor" | "archetype";
  notes?: string;
  measurements: MeasurementSet;
};
```

For local history:

```ts
type Snapshot = {
  id: string;
  createdAt: string;
  label?: string;
  measurements: MeasurementSet;
};
```

## Analytics To Add On Day One

Track only a few events:

- landing page view
- measurement form completed
- result viewed
- share link copied
- local snapshot saved
- return visit with existing local data

That is enough to tell whether the app is being used without building analytics debt.

## Privacy Stance

For MVP:

- No account system
- Local-first persistence
- No raw photo handling
- No training-data collection from user measurements by default
- Clear copy stating what is stored locally vs on the server

This is both simpler and more trustworthy.

## Copy And Positioning

Use plain positioning:

> Compare your current measurements to a curated set of target physiques and track changes over time.

Avoid claims that imply medical advice, optimization prescriptions, or objective attractiveness scoring.

## Build Sequence

### Phase 1: Working Single-User Tool

- Create the measurement schema
- Build the form
- Build the silhouette generator
- Build JSON-backed target data
- Implement match scoring
- Implement result page
- Save latest measurements locally

Exit condition:

- You can use it end to end by yourself and the outputs are stable.

### Phase 2: Launchable MVP

- Add multiple local snapshots
- Add overlap diff mode
- Add share links
- Add analytics
- Tighten landing-page copy and disclaimers
- Deploy publicly

Exit condition:

- A stranger can land, complete the flow, and understand the output without explanation.

### Phase 3: Nominal Traction Check

Watch for:

- completed result views
- copied share links
- returning browsers
- any inbound user feedback

Do not add major scope before this check.

## What To Build After MVP Only If It Earns It

- Accounts for cross-device history
- Larger target library
- Better weighting and filtering logic
- Photo-assisted measurement entry
- Hand-authored guidance content

Do not move into compounds, procedures, or user-submitted protocols unless the simpler product shows real pull first.

## Bottom Line

The first release should be a fast, visually interesting, private-by-default body comparison tool with local tracking.

That version is buildable, launchable, and still useful if the only persistent user is you.
