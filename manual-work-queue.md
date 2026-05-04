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
- `backend/app/data/targets.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## 3. Vetted Percentile Reference Data

Required input:

- selected reference population
- source URL and license
- field mapping
- unit conversion rules
- production reference label
- fixture outputs for tests

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
- account/sync decision
- photo/vision upload decision
- corpus moderation and exclusion policy

Use:

- `launch-decision-record.md`
- `deployment.md`
- `README.md`

Verification:

```powershell
.\verify.ps1
```

## Current Stop Condition

Do not mark the active build goal complete until these manual inputs are either:

- provided and implemented, or
- explicitly removed from launch scope by product decision.

