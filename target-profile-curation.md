# Target Profile Curation Guide

This guide defines how target profiles should be prepared before they are added
to `backend/app/data/targets.py` or a later controlled target data source.

The current target library is placeholder-quality. Production targets need
source notes, uncertainty labels, and consistent measurement assumptions.

## Profile Workflow

1. Choose whether the profile is a `character` or `archetype`.
2. Assign a stable lowercase `id` slug.
3. Add a clear `label`.
4. Fill every canonical measurement field from `target-profiles-template.json`.
5. Record how values were estimated in `notes`.
6. Keep uncertainty visible in the user-facing notes.
7. Validate the profile against `TargetProfile`.
8. Check matching behavior and comparison rendering.
9. Avoid implying that estimated profiles are exact body scans.

## Source Types

The current backend tests allow:

- `character`: fictional, celebrity-like, or named aesthetic target estimates.
- `archetype`: generalized shape profile such as runner, classic physique, or hourglass.

Do not add new `source_type` values without updating tests and UI filters.

## Measurement Rules

All targets use the same canonical measurement schema as user input:

- centimeters for lengths and circumferences
- kilograms for weight
- `sex` as `male` or `female`

Every numeric value must stay within the backend `MeasurementSet` bounds in
`backend/app/models.py`.

## Notes Requirements

Target notes must tell users what kind of estimate they are seeing.

For placeholder profiles, include the word `placeholder` so the existing
target-data tests keep uncertainty visible.

For production candidates, notes should include:

- source basis
- estimation method
- uncertainty level
- whether values are archetypal, measured, inferred, or composite
- any assumptions about pose, clothing, age, era, or depiction

## Validation

The template is checked by backend tests. Run:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Then run the full repo verifier:

```powershell
.\verify.ps1
```

## Production Bar

A target profile is not production-quality unless:

- all values have a defensible source or estimation method
- uncertainty is visible
- the profile validates against the backend schema
- match scoring has been checked for obvious ranking distortions
- the profile does not imply medical, biometric, or body-scan precision

