# Protocol Planning Notes

Status: local protocol tracker v1 implemented.

## Scope

The protocol tracker is a local-first n=1 planning log. It supports:

- Backend-seeded intervention taxonomy metadata.
- Local protocol create, edit, archive.
- Weekly adherence review with a 0-5 score.
- Snapshot-window outcome attribution.
- Conservative calorie-target projection bands.
- Plan retro copy comparing actual weight change with the planning band.
- Structured case-log summaries.
- Reliability / life-event annotations for procedure, postpartum, injury, and
  illness windows.

## Projection Model

The current projection is intentionally conservative. It uses the documented
linearized long-term Hall body-weight equation from the 2011 NIDDK/Lancet web
appendix:

```text
dBW/dt = deltaEI / rho - (BW - BW0) / tau
tau = rho / epsilon
```

The implementation estimates adult baseline fat mass with the appendix's
Jackson regression, uses the Mifflin-St. Jeor resting metabolic rate assumption
from the appendix, and exposes fallback assumptions in the UI: age 35 and PAL
1.5 when no richer user data exists. This avoids the old linear
3,500-kcal-per-pound rule and replaces the previous fixed time constant.

This is still not a full NIH Body Weight Planner clone. The app does not model
early glycogen, sodium, extracellular-fluid, or carbohydrate-intake changes, so
the label remains planning context only rather than a clinical prediction.

## Safety Posture

- Projections are shown only for calorie-target protocols.
- The app labels the output as planning context, not medical advice.
- Procedure and life-event entries do not predict outcomes; they pause or flag
  affected measurements as less reliable during the entered window.
- Surgical/pharma protocol guidance remains human-reviewed content.

## Sources

- https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
- https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner
- https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/nih-body-weight-planner
