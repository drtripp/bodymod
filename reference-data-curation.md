# Reference Data Curation Guide

This guide defines the standard for replacing the current approximate percentile
model in `backend/app/data/reference.py`.

The current reference model is a scaffold. It uses simple sex-specific normal
distributions and is explicitly labeled as not NHANES-calibrated. Production
percentiles need a documented source, transformation method, and validation
against representative fixtures.

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

Production data should map only supported fields:

- `height`
- `waistCircumference`
- `bideltoidCircumference`

Do not expose percentiles for fields without a credible reference distribution.

## Validation Requirements

Before replacing the scaffold:

- `normal_percentile` or its replacement remains bounded from 1 to 99.
- Higher values produce equal or higher percentiles for monotonic metrics.
- Sex-specific references produce expected differences for representative fixtures.
- The response `reference` label names the actual data source.
- Tests fail if the label still says `not NHANES-calibrated` after production data is claimed.

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

## Current Scaffold

Current files:

- `backend/app/data/reference.py`
- `backend/app/percentiles.py`
- `backend/tests/test_services.py`

The current label is:

```text
Approximate adult reference model, not NHANES-calibrated
```

That label must remain until a vetted replacement source is implemented and
documented.

