# Manual Work Queue

This queue lists the remaining work that cannot be completed truthfully from the
current codebase alone.

The same blockers are mirrored in
`backend/app/data/launch_readiness.seed.json`, exposed through
`/api/launch-readiness`, and shown in the account-panel launch-readiness
checklist. `backend/scripts/validate_curation.py` validates that each gate
links back to this queue and names a verification command.

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
- ANSUR-style importer scaffolding exists in
  `backend/scripts/build_ansur_reference.py` and
  `backend/app/data/reference.ansur.mapping.json`, but the real source file,
  license approval, codebook confirmation, and production wiring are still
  manual gates.

Use:

- `reference-data-curation.md`
- `backend/app/data/reference.py`
- `backend/app/percentiles.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## 4. Attractiveness Evidence Review

Required input:

- approve or revise `attractiveness-evidence-base.md`
- decide which evidence rows can ship as reference-only goal context
- review user-facing summaries for non-prescriptive wording
- approve do-not-ship/needs-research labels for contested face/body claims
- decide whether any extra cited sources are required before public launch

Current implemented baseline:

- editable seed scaffold at `backend/app/data/attractiveness_evidence.seed.json`
- backend API at `/api/attractiveness-evidence`
- goal builder shows matched evidence notes with human-review gating

Use:

- `attractiveness-evidence-base.md`
- `backend/app/data/attractiveness_evidence.seed.json`
- `backend/scripts/validate_curation.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\validate_curation.py
cd ..\frontend
npm run test:attractiveness-evidence
```

## 5. FoodData Central Production Import Review

Required input:

- API-key storage and server-side fetch policy
- source/citation wording and refresh cadence
- approved serving-size policy for per-100 g values versus serving-size scaling
- production nutrition QA fixtures for generic, branded, and edge-case rows
- decision on whether branded foods come from FDC, Open Food Facts, or both

Current implemented baseline:

- dummy backend seed at `backend/app/data/food_usda.seed.json`
- offline importer at `backend/scripts/build_fdc_food_seed.py`
- generated candidate files can validate with real numeric FDC IDs while the
  bundled dummy seed still requires `dummy-*` provenance

Use:

- `food-data-curation.md`
- `backend/app/data/food_usda.seed.json`
- `backend/scripts/build_fdc_food_seed.py`
- `backend/scripts/validate_curation.py`

Verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests\test_fdc_food_import.py
.\.venv\Scripts\python.exe scripts\validate_curation.py
```

## 6. Launch Privacy And Moderation Approvals

Required input:

- share URL decision
- production analytics decision
  - agent wiring now exists as a disabled-by-default first-party sanitized
    `/api/product-analytics` path; the remaining decision is provider/hosting
    approval and whether to enable upload in production
- account/sync decision
  - current code has an email magic-link identity scaffold with dev-token
    verification for local testing, a generic SMTP sender that emails
    clickable `magicLinkToken` URLs without returning login tokens in JSON,
    plus a token-scoped encrypted sync-vault scaffold, manual account-panel
    create/push/pull/merge/revoke UI, and an opt-in browser auto-sync preview
    that reuses the encrypted vault path, but no approved production email
    provider, account recovery, or provider-backed background cross-device sync
- live-update provider/signing decision
  - current code has a review-only backend live-update manifest and
    account-panel drift check, but no production Capgo/self-hosted provider,
    signed bundle workflow, staged rollout, or rollback policy
- photo/vision upload decision
- side-profile model/license decision if automatic sagittal face inference is
  in launch scope; current code only ships browser-local frontal landmarks and
  manual side-profile logs
- legal owner/contact details
- approval of privacy policy, terms, and medical disclaimer drafts
- corpus moderation and exclusion policy
  - agent wiring now exists as a review-only `POST /api/case-log-submissions`
    queue backed by SQLite; account-panel submissions send summarized protocol
    case logs without account IDs, private notes, photos, or raw measurement
    fields, and nothing is published into the strategy corpus automatically

Use:

- `launch-decision-record.md`
- `frontend/public/legal/`
- `deployment.md`
- `README.md`
- `face-measurement-research.md`

Verification:

```powershell
.\verify.ps1
```

## 7. Procedure Taxonomy Review

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

## 8. Bloodwork Marker And Range Review

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
