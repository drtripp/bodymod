# Similarity Score Implementation Spec

This document specifies how to replace the placeholder similarity display with a
bounded, calibrated 0-100 similarity score. The constants below were derived
from the current scoring code and seed target data on 2026-06-09; the
derivation is reproducible with the calibration script described in this
document.

The backend stays. Similarity is computed server-side in the match response so
there is one tested source of truth and the API stays useful for future
clients.

## Problem

The raw match score in `backend/app/services.py` (`score_match`) is an
unbounded weighted distance: zero means identical, larger means less similar,
and there is no upper bound. Two display problems follow:

1. `frontend/src/components/ResultSummary.jsx` renders it as
   `(1 - score) * 100` clamped at zero. Any distance above 1.0 displays as 0%,
   and the percentage scale is arbitrary. Current cross-target distances run
   from 0.35 to 1.66, so the existing display already saturates.
2. The number has no stable meaning. If scoring weights change, every displayed
   percentage shifts with no anchor to what "85%" is supposed to convey.

## Goals

- A similarity score in [0, 100] where the value has a defined meaning:
  - 100: measurement sets are identical
  - ~95 or above: within ordinary re-measurement error of the target
  - ~40: about as far apart as two typical different builds in the target set
  - approaching 0: maximally dissimilar within the curated set
- Ranking behavior unchanged: ordering by similarity descending must equal the
  current ordering by raw distance ascending.
- The raw distance, score parts, and explanation bullets are untouched. This
  spec changes only the mapping and display.

## Non-Goals

- Recalibrating the scoring weights in `SCORING_KEYS` / `SCORING_RATIOS`.
- Replacing placeholder target data (tracked in `target-profile-curation.md`).
- Frontend-side scoring for offline mode (offline mode continues to show no
  match results).

## Design

### Mapping

Map raw distance `d` to similarity with a stretched exponential:

```
similarity = 100 * exp(-(d / TAU) ** P)
```

with constants:

```
P   = 1.5
TAU = 1.0
```

### Why this shape

Two calibration anchors were chosen:

- **Noise anchor.** Re-measuring the same body should score ~95 or better.
  Simulated re-measurement noise (per-field Gaussian error, SDs listed under
  Calibration Data) against the current targets gives a 90th-percentile
  distance of **0.139**.
- **Different-build anchor.** Two typical different builds should land near 40.
  The median pairwise distance across the six seed targets is **0.941**.

A plain exponential `100 * exp(-d / tau)` cannot satisfy both: the noise anchor
requires `tau = 2.70` while the different-build anchor requires `tau = 1.03`.
The exponent `P` adds the needed degree of freedom. Solving both anchors
exactly gives `P = 1.506`, `TAU = 0.997`, which round to `P = 1.5`,
`TAU = 1.0` with negligible error (95.0 and 40.1 at the two anchors).

The exponent greater than 1 also flattens the curve near zero, which is the
correct behavior: small distances are dominated by measurement noise, so the
score should not swing several points between two readings of the same body.

### Sex mismatch

`score_match` adds a flat 0.12 to the distance when sexes differ. Under this
mapping, two otherwise-identical profiles of different recorded sex score
**95.9**, i.e. the penalty caps cross-sex matches just below the
re-measurement band. That is acceptable for now. Revisit the penalty size when
real target data lands.

### Rounding and bounds

- Round similarity to one decimal in the API; the frontend displays the
  integer.
- `d = 0` maps to exactly 100.0. The function is strictly decreasing, never
  negative, so no clamping is required, but the implementation should still
  guard `d < 0` to 0 defensively.

## Calibration Data

Derived 2026-06-09 against the six seed targets with the current scoring
weights. Re-derive (see Calibration Script) whenever targets, weights, or the
measurement schema change.

Pairwise target distances and resulting similarities:

| Pair | Distance | Similarity |
|---|---|---|
| thor vs shadowheart | 1.655 | 11.9 |
| shadowheart vs classic-physique | 1.603 | 13.1 |
| thor vs soft-hourglass | 1.487 | 16.3 |
| thor vs runner-archetype | 1.419 | 18.5 |
| classic-physique vs runner-archetype | 1.236 | 25.3 |
| classic-physique vs soft-hourglass | 1.199 | 26.9 |
| astarion vs thor | 1.167 | 28.3 |
| astarion vs classic-physique | 0.941 | 40.1 |
| astarion vs soft-hourglass | 0.759 | 51.6 |
| astarion vs shadowheart | 0.742 | 52.8 |
| runner-archetype vs soft-hourglass | 0.690 | 56.4 |
| shadowheart vs runner-archetype | 0.531 | 67.9 |
| thor vs classic-physique | 0.496 | 70.6 |
| astarion vs runner-archetype | 0.345 | 81.6 |

Sanity check: the extremes are the right pairs. Thor vs Shadowheart (largest
male vs smallest female) bottoms out at 11.9; Astarion vs the lean runner
archetype (two similar lean builds) tops out at 81.6.

Re-measurement noise simulation (300 draws per target, fixed seed 7), assumed
per-field measurement error SDs in cm/kg:

| Field group | SD |
|---|---|
| height | 0.6 |
| weight | 0.7 |
| head, wrist | 0.4-0.5 |
| widths (biacromial, bideltoid), neck | 0.8 |
| large torso circumferences (bideltoid, armpit, nipple, waist, pant waist) | 1.5 |
| underbust, hip | 1.2 |
| thighs | 1.0 |
| calf, bicep, forearm | 0.6-0.7 |

Resulting similarity of a noisy re-measurement against its own target:
median **97.2**, 90th percentile **95.0**, 99th percentile **91.9**, worst of
1800 draws **86.2**. These SDs are assumptions about tape-measure error, not
measured data; they are recorded here so recalibration uses the same model.

## Backend Changes

### `backend/app/services.py`

Add the mapping next to the existing scoring code:

```python
from math import exp

SIMILARITY_EXPONENT = 1.5
SIMILARITY_SCALE = 1.0


def similarity_from_distance(distance: float) -> float:
    safe_distance = max(distance, 0.0)
    return round(
        100 * exp(-((safe_distance / SIMILARITY_SCALE) ** SIMILARITY_EXPONENT)),
        1,
    )
```

In `build_match_response`, populate the new field:

```python
MatchResult(
    ...,
    score=score_match(current, target),
    similarity=similarity_from_distance(score_match(current, target)),
    ...
)
```

(Compute the distance once per target rather than calling `score_match`
twice.) Ranking continues to sort by `score` ascending.

### `backend/app/models.py`

```python
class MatchResult(BaseModel):
    id: str
    label: str
    score: float
    similarity: float = Field(ge=0, le=100)
    ...
```

`score` (raw distance) stays in the response. It is the stable internal
quantity, it is what tests rank by, and removing it would be an API break for
no gain.

## Frontend Changes

### `frontend/src/components/ResultSummary.jsx`

Replace `formatScore`:

```js
function formatScore(similarity) {
  if (typeof similarity !== "number") {
    return "--";
  }

  return `${Math.round(similarity)}%`;
}
```

and pass `result?.top_match?.similarity` / `runnerUp.similarity` instead of
`score`. Remove the `TBD` suffix.

### Copy

Update the methodology note in the same component. The score now has a defined
meaning, but the targets are still placeholders, so keep that caveat:

> Similarity: 100 means identical measurements, 95+ is within typical
> re-measurement error, around 40 is a different build. Target profiles are
> still placeholder estimates.

The `Method / privacy` footnote (`InfoFootnote.jsx`) should gain one sentence
stating the mapping (`100 * exp(-distance^1.5)`) so the methodology is
inspectable without reading the repo.

## Calibration Script

Add `backend/scripts/calibrate_similarity.py`, runnable with the backend venv:

1. Compute all pairwise `score_match` distances across `TARGETS`; report min /
   median / max.
2. Run the noise simulation (fixed seed, the SD table above) and report the
   50th/90th/99th percentile distances.
3. Solve the two-anchor system for exact `P` and `TAU`:
   - `P = ln(ln(s2) / ln(s1)) / ln(d2 / d1)` with `(d1, s1)` the noise anchor
     (p90 distance, 0.95) and `(d2, s2)` the different-build anchor (median
     pairwise distance, 0.40)
   - `TAU = d2 / (-ln(s2)) ** (1 / P)`
4. Print the suggested rounded constants and the resulting pairwise similarity
   table for manual review.

The script informs constant updates; it does not write code. When its
suggested constants drift meaningfully from `P = 1.5`, `TAU = 1.0` (because
targets or weights changed), update the constants in `services.py`, the tables
in this document, and the regression test bands below in the same commit.

## Test Plan

Backend (`backend/tests/test_services.py`):

- exact self-match: `similarity_from_distance(0.0) == 100.0`, and the existing
  exact-target-match test additionally asserts `top_match.similarity == 100.0`.
- curve regression (pins the mapping, independent of target data):
  `similarity_from_distance(0.139)` in [94.5, 95.5] and
  `similarity_from_distance(0.941)` in [39.5, 40.5].
- bounds: for an arbitrary valid measurement set, every match has
  `0 < similarity <= 100`.
- monotonicity: ranking by `similarity` descending equals ranking by `score`
  ascending across all matches.
- cross-sex cap: identical measurements with flipped sex yield similarity in
  [95.5, 96.5].

Backend (`backend/tests/test_api.py`):

- `/api/match` response includes `similarity` on every match, bounded
  [0, 100], ordered consistently with `score`.

Frontend (`frontend/tests/app.spec.js`):

- top-match block shows `Similarity score: <integer>%` and no longer contains
  `TBD`.

Run `.\verify.ps1` before merging.

## Acceptance Criteria

- A user entering measurements identical to a target sees 100%.
- Re-entering slightly different tape readings of the same body keeps the top
  match score at roughly 95 or above and does not change the top match.
- The displayed percentage never clamps at 0% for realistic input.
- Match ordering is byte-identical to the pre-change ordering for the same
  input.
- All copy describing the score as placeholder/TBD is updated; the
  placeholder-target caveat remains.

## Recalibration Triggers

Re-run the calibration script and review the constants when any of these
change:

- target profiles added, removed, or re-estimated (especially the move from
  placeholder to curated data tracked in `target-profile-curation.md`)
- `SCORING_KEYS` / `SCORING_RATIOS` weights or the sex penalty
- measurement schema fields
- the noise SD assumptions, if real repeat-measurement data ever informs them

The displayed meaning ("95 is re-measurement noise, 40 is a different build")
is the contract; the constants exist to keep that contract true as the data
underneath improves.
