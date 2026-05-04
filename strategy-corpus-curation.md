# Strategy Corpus Curation Guide

This guide defines how manually researched strategy entries should be prepared
before importing them into the app with `strategy-corpus-template.json`.

The corpus is informational. It should help users compare claims, evidence,
uncertainty, risk, reversibility, cost, and review status. It should not provide
instructions, dosing, protocols, personalized recommendations, or coaching.

## Entry Workflow

1. Choose one desired outcome.
2. Add candidate strategies with neutral names.
3. Classify each strategy by intervention type.
4. Record claimed mechanism and expected magnitude in non-procedural language.
5. Add source links and source type.
6. Score efficacy and risk separately on a 0-100 scale.
7. Record uncertainty, reversibility, time horizon, cost, legal notes, and flags.
8. Set review status.
9. Check that copy remains informational and does not tell a user what to do.
10. Import the JSON locally and inspect the plotted position and detail copy.

## Evidence Levels

Use only the levels supported by `frontend/src/lib/strategyCorpus.js`:

- `strong`: multiple credible sources support the general effect.
- `moderate`: some credible evidence exists, but magnitude or applicability is limited.
- `clinical`: clinical or medical/cosmetic context exists and professional review is required.
- `situational`: effect may exist only in narrow contexts or as an indirect aid.
- `anecdotal`: mostly user reports, weak observation, or informal evidence.
- `unsupported`: claim lacks credible support or has not been reviewed.

Do not upgrade evidence level because a claim is popular online.

## Review Statuses

Use only the statuses supported by the app:

- `seeded`: illustrative prototype entry, not production-reviewed.
- `needs source review`: entry has enough structure to research, but sources are incomplete.
- `needs clinical review`: medical, surgical, pharmaceutical, or clinical-adjacent review is needed.
- `exclude from personalization`: entry may be described informationally, but must not be used in ranking, recommendation, coaching, or next-step flows.

## Risk And Efficacy Scores

Scores are plotting coordinates, not advice.

Efficacy should estimate likely appearance or measurement effect:

- `0-20`: no demonstrated effect or negligible visible change.
- `21-45`: small, indirect, temporary, or highly context-dependent effect.
- `46-70`: plausible or commonly observed effect with meaningful limits.
- `71-90`: large or durable effect in the right context.
- `91-100`: reserved for unusually strong, well-supported effects.

Risk should estimate downside severity, not just probability:

- `0-20`: low downside when used normally.
- `21-45`: manageable downside, cost, discomfort, or adherence burden.
- `46-70`: meaningful medical, psychological, financial, permanence, or complication concerns.
- `71-90`: high consequence, invasive, legally sensitive, or difficult to reverse.
- `91-100`: severe downside potential or unacceptable uncertainty.

When unsure, lower efficacy and raise uncertainty. Do not lower risk because the
entry is common or culturally normalized.

## Sensitivity Rules

Use sensitivity to control how conservatively the product treats the entry:

- `low`: ordinary training, grooming, clothing, measurement literacy, or lifestyle-adjacent content.
- `clinical`: requires licensed professional context or clinical contraindication review.
- `surgical`: invasive procedure or implant/body-structure alteration.
- `pharmaceutical`: prescription, drug, hormone, compound, or medication-adjacent item.
- `medical-adjacent`: hydration manipulation, injury risk, eating-disorder risk, device risk, or health-sensitive practice.

Clinical, surgical, pharmaceutical, and medical-adjacent entries should be
excluded from personalization by default.

## Required Source Metadata

Each source link should include:

- `title`
- `url`
- `sourceType`
- `reviewedAt` in `YYYY-MM-DD` format

Useful `sourceType` examples:

- `paper`
- `clinical guidance`
- `professional society`
- `regulatory page`
- `expert commentary`
- `product page`
- `anecdote`
- `forum report`

Source type should describe the source, not endorse it.

## Copy Guardrails

Allowed:

- neutral descriptions of what people attempt
- claimed mechanisms
- known or alleged risks
- uncertainty and evidence quality
- reversibility, cost, time horizon, and sensitivity labels
- links to sources

Not allowed:

- dosing
- procedural steps
- stacking or cycling instructions
- evasion or sourcing guidance
- personalized recommendations
- "best next step" ranking for risky interventions
- language that urges escalation to medical, surgical, pharmaceutical, or extreme practices

## Import Validation

Before treating a curated file as usable:

```bash
cd frontend
npm run test:corpus
```

Then import the JSON in the app and inspect:

- plotted efficacy/risk position
- source links
- flags and legal notes
- personalization exclusion state
- search and filters
- mobile layout if the entry text is long

