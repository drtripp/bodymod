# Food Data Curation

The bundled food lookup seed is still dummy USDA FoodData Central-style data.
It exists so Diet flows, micronutrient totals, and tests work without an API
key or production nutrition claims.

## Current Files

- `backend/app/data/food_usda.seed.json` - bundled dummy lookup seed.
- `backend/app/data/food_usda.py` - loader and search helper.
- `backend/scripts/build_fdc_food_seed.py` - offline importer for a locally
  reviewed FoodData Central API-style JSON export or reviewed flat CSV.
- `backend/scripts/validate_curation.py` - validates dummy seed files and
  review-gated candidate imports.
- `backend/tests/test_fdc_food_import.py` - importer and candidate validation
  coverage.

## Import Scaffold

The importer intentionally does not fetch USDA data itself. First export or
prepare the source file locally, review API-key handling and source metadata,
then run:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\build_fdc_food_seed.py `
  path\to\fdc-foods.json app\data\food_usda.generated.json `
  --source-url https://fdc.nal.usda.gov/ `
  --retrieved-at 2026-06-13
```

For FoodData Central API-style JSON, nutrient values are treated as per 100 g
by default and the generated serving is `100 g`. If the reviewed export should
use FDC `servingSize` values in grams or milliliters, pass:

```powershell
.\.venv\Scripts\python.exe scripts\build_fdc_food_seed.py `
  path\to\fdc-foods.json app\data\food_usda.generated.json `
  --use-fdc-serving-size
```

The importer also accepts a flat CSV with columns such as:

```text
fdcId,name,brand,serving,keywords,calories,protein,carbs,fat,fiber,sodium
```

Required macro columns are `calories`, `protein`, `carbs`, and `fat`.
Supported micronutrient columns are `fiber`, `sugar`, `sodium`, `potassium`,
`calcium`, `iron`, `magnesium`, `zinc`, `vitaminC`, `vitaminD`, and
`vitaminB12`. Missing micronutrients are filled as `0` so the app schema stays
stable; missing macros fail the import.

Validate a generated candidate before any review:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\validate_curation.py `
  --food-file app\data\food_usda.generated.json
```

Candidate imports must keep the source text `FoodData Central candidate import`
and a review note. The validator allows real numeric FDC IDs only for those
review-gated candidate files. The bundled dummy seed still requires `dummy-*`
FDC provenance.

## Production Gates

Do not replace `food_usda.seed.json` until these are approved:

- API-key storage and server-side fetch policy.
- FoodData Central source/citation wording.
- Release/date strategy for refreshed datasets.
- Serving-size policy for per-100 g versus serving-size scaled nutrients.
- Nutrition QA fixtures for representative generic, branded, and edge-case
  rows.
- Product decision on whether branded foods come from FDC, Open Food Facts, or
  both.
