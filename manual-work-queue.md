# Manual Work Queue

This queue lists the remaining work that cannot be completed truthfully from the
current codebase alone.

## 1. Source-Reviewed Strategy Corpus

Required input:

- prioritized outcome list
- source-reviewed strategy entries
- evidence/risk/reversibility scores
- legal and contraindication notes
- moderation decisions for high-risk entries

Use:

- `strategy-corpus-curation.md`
- `strategy-corpus-template.json`
- `frontend/src/lib/strategyCorpus.js`

Verification:

```powershell
cd frontend
npm run test:corpus
```

## 2. Production Target Profiles

Required input:

- target library scope
- source or estimation method for each target
- production notes and uncertainty labels
- decision on named fictional or real-person targets

Use:

- `target-profile-curation.md`
- `target-profiles-template.json`
- `backend/app/data/targets.seed.json`
- `backend/app/repositories.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## 3. Broader Vetted Percentile Reference Data

Required input:

- selected reference population for fields not covered by the NHANES overlay
- source URL and license
- field mapping
- unit conversion rules
- production reference label
- fixture outputs for tests

Current implemented baseline:

- NHANES August 2021-August 2023 adult height, weight, waist circumference, and
  hip circumference are implemented in
  `backend/app/data/reference.nhanes.seed.json`.
- Unsupported schema fields still use the labeled scaffold in
  `backend/app/data/reference.seed.json`.

Use:

- `reference-data-curation.md`
- `backend/app/data/reference.py`
- `backend/app/percentiles.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## 4. Launch Privacy And Moderation Approvals

Required input:

- share URL decision
- production analytics decision
  - agent wiring now exists as a disabled-by-default first-party sanitized
    `/api/product-analytics` path; the remaining decision is provider/hosting
    approval and whether to enable upload in production
- account/sync decision
- photo/vision upload decision
- legal owner/contact details
- approval of privacy policy, terms, and medical disclaimer drafts
- corpus moderation and exclusion policy

Use:

- `launch-decision-record.md`
- `frontend/public/legal/`
- `deployment.md`
- `README.md`

Verification:

```powershell
.\verify.ps1
```

## 5. Procedure Taxonomy Review

Required input:

- reviewed procedure categories and labels
- default healing-window ranges by procedure/body area
- affected measurement field mappings
- approved photo stream guidance
- clinical/body-mod safety copy and exclusion policy

Use:

- `backend/app/data/procedures.seed.json`
- `backend/app/data/procedures.py`
- `frontend/src/lib/procedures.js`
- `frontend/src/components/AccountGoalPanel.jsx`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests\test_api.py
cd ..\frontend
npm run test:procedures
```

## 6. Bloodwork Marker And Range Review

Required input:

- reviewed marker groups, labels, units, and aliases
- sex/context-specific reference ranges and out-of-range copy
- approved panel presets for hormones, lipids, metabolic, thyroid, and inflammation markers
- explicit local-only health-data privacy copy
- decision on whether any future sync must remain client-side encrypted

Use:

- `backend/app/data/bloodwork.seed.json`
- `backend/app/data/bloodwork.py`
- `frontend/src/lib/bloodwork.js`
- `frontend/src/components/AccountGoalPanel.jsx`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests\test_api.py
cd ..\frontend
npm run test:bloodwork
```

## Current Stop Condition

Do not mark the active build goal complete until these manual inputs are either:

- provided and implemented, or
- explicitly removed from launch scope by product decision.
