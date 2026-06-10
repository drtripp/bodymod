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

The current projection is intentionally conservative. It uses a dynamic,
asymptotic response to a daily calorie delta so it does not repeat the old
linear 3,500-kcal-per-pound rule. It is labeled as a
NIDDK/Hall-inspired planning band, not a full NIH Body Weight Planner clone.

The NIDDK Body Weight Planner is based on Kevin Hall's research group and the
Lancet 2011 paper "Quantification of the effect of energy imbalance on
bodyweight." NIDDK also publishes the full model equation PDF through the Body
Weight Planner research page. A future exact implementation should port or call
the documented equation set rather than treating this v1 band as equivalent.

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
