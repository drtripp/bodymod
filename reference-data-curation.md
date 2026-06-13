# Reference Data Curation Guide

This guide defines the standard for replacing or extending the current mixed
percentile model in `backend/app/data/reference.py`,
`backend/app/data/reference.seed.json`, and
`backend/app/data/reference.nhanes.seed.json`.

The current reference model is mixed. Adult height, weight, waist circumference,
and hip circumference use official NHANES August 2021-August 2023 adult tables
as a field-level overlay. Unsupported schema fields still use simple
sex-specific normal distributions from the backend scaffold seed and must stay
clearly labeled as scaffold estimates. Any further production percentile work
needs a documented source, transformation method, and validation against
representative fixtures.

## Replacement Workflow

1. Choose a reference population and document why it fits the product.
2. Record source name, access URL, publication date, and retrieval date.
3. Confirm the data license permits use in the app.
4. Map source fields to the canonical measurement names used by `MeasurementSet`.
5. Record units and conversion rules.
6. Decide whether the data supports sex-specific, age-specific, or other strata.
7. Define how missing measurements are handled.
8. Generate percentile tables or distribution parameters.
9. Add tests proving percentile monotonicity, bounds, sex/strata differences, and known fixture outputs.
10. Update UI copy so users know which population is being used.

## Minimum Metadata

For each source, capture:

- source name
- source organization
- source URL
- publication or dataset version date
- retrieval date
- license or use restriction
- included population
- excluded population
- measurement protocol summary
- field mapping
- unit conversion rules
- known limitations

## Measurement Mapping

The current dummy seed covers every numeric measurement schema field so the API
and frontend can validate full-field wiring. The NHANES overlay replaces only
fields that directly match published adult NHANES tables. Production data should
only present field-level source-backed status for fields with a credible
reference distribution. If a vetted source covers fewer fields than the dummy
seed, unsupported fields must remain visibly marked as scaffold estimates or be
removed from production output with matching UI copy/tests.

## Validation Requirements

Before replacing or extending the scaffold:

- `normal_percentile` or its replacement remains bounded from 1 to 99.
- Higher values produce equal or higher percentiles for monotonic metrics.
- Sex-specific references produce expected differences for representative fixtures.
- The response `reference` label names the actual data source for supported
  fields and the scaffold status for unsupported fields.
- Field-level metadata identifies which fields are source-backed and which are
  scaffold estimates.
- Tests fail if production data is claimed without field-level source metadata.

## Copy Requirements

Allowed:

- "Compared with [source/population] adults"
- "Estimated percentile"
- "Reference population"
- "Not a health ranking"

Not allowed:

- implying universal attractiveness rank
- implying medical diagnosis
- implying a moral hierarchy
- hiding source limitations
- mixing scaffold and production labels

## Current Mixed Model

Current files:

- `backend/app/data/reference.py`
- `backend/app/data/reference.seed.json`
- `backend/app/data/reference.nhanes.seed.json`
- `backend/app/data/reference.ansur.mapping.json`
- `backend/app/percentiles.py`
- `backend/scripts/build_ansur_reference.py`
- `backend/tests/test_services.py`
- `backend/tests/test_ansur_import.py`
- `backend/tests/test_schema_alignment.py`

Current source-backed overlay:

- NHANES August 2021-August 2023 adults age 20 and older
- fields: height, weight, waist circumference, hip circumference
- source: Fryar CD, Gu Q, Afful J, Carroll MD, Ogden CL. Anthropometric
  Reference Data for Children and Adults: United States, August 2021-August
  2023. Vital Health Stat 3. 2025 Jun;(50):1-28. DOI: 10.15620/cdc/174595.
- SD method: estimated from each table's published 5th and 95th percentiles as
  `(p95 - p5) / 3.2897` so the current normal percentile helper can consume the
  tables while preserving the published percentile values in JSON.

The current API label is:

```text
NHANES August 2021-August 2023 adults for height, weight, waist, and hip; approximate scaffold for unsupported fields
```

That mixed-source caveat must remain until unsupported fields are either backed
by vetted sources such as ANSUR or removed from production percentile output.

## ANSUR Import Scaffold

`backend/scripts/build_ansur_reference.py` can build a partial reference
overlay from a locally reviewed ANSUR-style CSV using
`backend/app/data/reference.ansur.mapping.json`.

Example:

```bash
cd backend
.\.venv\Scripts\python.exe scripts\build_ansur_reference.py ^
  path\to\ansur.csv app\data\reference.ansur.generated.json ^
  --source-url https://example.com/ansur-source ^
  --retrieved-at 2026-06-13
```

The script normalizes male/female rows, converts millimeters to centimeters,
computes sex-specific means, sample standard deviations, and selected
percentiles, and validates the generated payload against the backend reference
model. Generated fields stay `isVetted: false` unless the script is run with
`--mark-vetted` after source, license, codebook, and population-fit review.
Do not wire generated ANSUR output into production reference data until those
manual checks are complete.
