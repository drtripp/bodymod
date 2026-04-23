# Site Implementation Plan

## Product Shape

Build a small web app with one clear job:

- accept a measurement set
- render a front-view silhouette
- compare it to a curated set of targets
- save local snapshots for reuse

The site should feel utilitarian and deliberate, not promotional. It should read more like a tool than a startup landing page.

## UI Direction

The visual bar is intentionally minimal.

### Rules

- No gradients
- No rounded cards or pill buttons
- No decorative animation
- No glassmorphism
- No marketing-style hero art
- No floating panels
- No dense dashboard chrome

### Desired Feel

- Flat backgrounds
- Sharp edges
- Clear grid
- Strong typography
- Plain borders
- Tight spacing discipline
- Functional color used sparingly

### Suggested Visual System

- Background: off-white or light gray
- Foreground: near-black text
- Borders: 1px neutral gray or black
- Accent colors: one warm tone and one cool tone only where the comparison view needs semantic difference
- Font stack: system serif or a restrained sans if you want it to feel more technical

Recommended default:

- `font-family: Georgia, "Times New Roman", serif;`
- This helps avoid the generic AI-product look immediately.

If you want a sans option:

- `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;`

## Site Architecture

Keep the app small. A marketing site is unnecessary.

### Pages

#### 1. Home / Tool Page

Primary page and likely the default route.

Contains:

- one-sentence description
- measurement form
- result panel
- ranked matches
- comparison view
- local snapshot controls

This should be usable without navigating elsewhere.

#### 2. About / Method

Short static page covering:

- what the app does
- what the measurements mean
- how matching works at a high level
- what percentile output means
- what data is stored locally

This page exists to build trust and reduce confusion, not for branding.

#### 3. Privacy

Short static page covering:

- no account required
- what is stored in browser storage
- whether share links encode data directly or use saved snapshot ids
- whether analytics are collected

#### 4. Optional Shared Result Route

If shareable URLs are implemented with a route instead of query params:

- `/r/[id]`

This route should render a read-only result view.

## App Sections On Main Page

### Header

Very small.

Contains:

- product name
- one-line purpose statement
- simple nav links to `Method` and `Privacy`

No hero section.

### Measurement Form

Single-column on mobile, two-column on desktop if it remains clean.

Fields:

- height
- weight
- sex
- shoulders
- underbust
- waist
- hips

Requirements:

- labels always visible
- units shown clearly
- short helper text for how to measure
- validation messages inline and plain

### Results Summary

Contains:

- silhouette
- percentile summary
- top match
- secondary matches

This block should appear immediately after submit with no separate results page required.

### Comparison Panel

Contains:

- mode toggle: side-by-side / overlap
- legend for grow vs shrink
- target selector from ranked list

Keep the controls plain. Tabs can just be bordered buttons.

### Snapshot Panel

Contains:

- save current measurements as snapshot
- list of prior local snapshots
- compare current vs prior snapshot
- delete local snapshot

This is the retention feature. It should not be buried.

## Information Architecture

The order of information on the tool page should be:

1. short explanation
2. measurement input
3. primary result
4. comparison controls
5. ranked matches
6. local snapshot history
7. small methodology note

Do not lead with long copy. The tool itself should dominate the page.

## Functional Modules

### 1. Measurement Schema

Create a single source of truth for:

- field names
- labels
- units
- validation rules
- form ordering

This should drive both the UI and the comparison logic.

### 2. Form + Validation

Responsibilities:

- render fields
- validate ranges
- normalize units if needed
- convert user input into canonical measurement format

Keep validation deterministic and boring.

### 3. Silhouette Generator

Responsibilities:

- take canonical measurements
- return SVG path data or SVG component props
- support both user and target profiles

Keep the math isolated from UI code.

### 4. Matching Engine

Responsibilities:

- read target dataset
- normalize measurements
- compute distance score
- return ranked matches

The first version should prioritize inspectability over sophistication.

### 5. Percentile Module

Responsibilities:

- take measurements
- compare to reference distribution
- return percentile values and any display copy

Use approximate output language. Avoid false precision.

### 6. Comparison Renderer

Responsibilities:

- show user silhouette and target silhouette
- support side-by-side mode
- support overlap mode
- render growth/shrink regions or simple visual diff

If polygon difference becomes a time sink, ship a simpler overlap first and improve later.

### 7. Local Snapshot Store

Responsibilities:

- save snapshots in local storage
- load latest snapshot
- list history
- compare current input to a saved snapshot

Use explicit versioning in stored data so schema changes are survivable.

### 8. Share Link Module

Responsibilities:

- serialize result state into URL or server-side id
- restore read-only result from link

If privacy is uncertain, defer this until after the local-first flow works.

### 9. Analytics

Track only:

- page view
- form submit
- result render
- snapshot save
- share action
- return visit

This should stay thin and non-invasive.

## Technical Structure

Recommended stack:

- `Next.js`
- `TypeScript`
- `App Router`
- CSS Modules or a single global stylesheet

Avoid UI frameworks unless they materially reduce build time. They often drag the visual language toward generic app styling.

### Suggested Directory Layout

```text
app/
  layout.tsx
  page.tsx
  method/page.tsx
  privacy/page.tsx
  r/[id]/page.tsx

components/
  measurement-form.tsx
  silhouette-view.tsx
  result-summary.tsx
  comparison-panel.tsx
  match-list.tsx
  snapshot-panel.tsx
  site-header.tsx

lib/
  measurements.ts
  validation.ts
  silhouette.ts
  matching.ts
  percentiles.ts
  storage.ts
  share.ts
  analytics.ts

data/
  targets.json
  reference-population.json

styles/
  globals.css
```

## CSS Rules

Set these constraints early so the app does not drift into generated-site aesthetics.

### Base Rules

- `border-radius: 0`
- minimal box-shadow usage, ideally none
- no animation unless it communicates state change
- no transitions on page sections
- no large empty hero spacing
- no oversized CTA buttons

### Layout Rules

- max width around `900px` to `1100px`
- left-aligned text by default
- visible section separators using borders or spacing, not background tricks
- use whitespace intentionally, not lavishly

### Component Rules

- Buttons are rectangular
- Inputs are rectangular
- Panels are simple bordered blocks
- Result emphasis comes from ordering and typography, not decoration

## Implementation Phases

### Phase 1: App Skeleton

Build:

- Next.js app scaffold
- global layout
- header
- main route
- static method/privacy pages
- base stylesheet with the visual rules locked in

Exit condition:

- the site shell exists and already reflects the intended minimal style

### Phase 2: Core Input + Result Loop

Build:

- measurement schema
- form UI
- validation
- silhouette generator stub
- target dataset loader
- match computation stub
- result summary layout

Exit condition:

- you can enter data and see a deterministic placeholder or early silhouette plus ranked matches

### Phase 3: Real Comparison Engine

Build:

- actual silhouette generation from measurements
- side-by-side comparison
- overlap comparison
- legend and explanatory copy
- percentile display

Exit condition:

- the tool is visually coherent and the output is interpretable without explanation

### Phase 4: Local Utility Layer

Build:

- local snapshot saving
- snapshot history
- compare against previous self
- restore latest snapshot on load

Exit condition:

- the app is personally useful even without public traffic

### Phase 5: Launch Layer

Build:

- analytics
- share links if acceptable
- metadata
- production deployment config
- final copy pass

Exit condition:

- the site is public and nominal traction can be measured

## Launch Checklist

- Form works on mobile
- SVG renders correctly at small and large widths
- Validation catches impossible or obviously broken inputs
- Local snapshots survive refresh
- Result page is understandable without a walkthrough
- Privacy and method pages exist
- Analytics events fire
- There is at least one meaningful reason for you to come back and use it again

## Non-Goals

Do not add these during initial build:

- account system
- AI assistant
- chat UI
- procedural recommendation engine
- image upload workflow
- social feed
- elaborate design system
- animated illustrations

## Immediate Next Step

Start by scaffolding the actual app shell and locking in the CSS constraints first.

That prevents the project from drifting visually while the core logic is being built.
