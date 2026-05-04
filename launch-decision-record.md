# Launch Decision Record

This document captures decisions that must be made before treating the current
prototype as a public product.

The current app is local-first and measurement-first. It does not include
accounts, photo uploads, external analytics, production corpus content, or
server-side sharing.

## Current Decisions

### Accounts

Status: not approved for current build.

Rationale:

- local snapshots satisfy the current private-use loop
- accounts would add sensitive data custody before there is a clear user need
- cross-device sync can be revisited after local retention proves useful

### Photo Or Vision Uploads

Status: not approved for current build.

Rationale:

- raw body images are privacy-sensitive
- model licensing and biometric-processing questions are unresolved
- manual measurement entry is the current first-class workflow

### External Analytics

Status: not approved for current build.

Rationale:

- current telemetry is local-only in browser storage
- production analytics need a privacy review and event minimization pass
- measurement data should not be sent to analytics providers by default

### Strategy Recommendations

Status: not approved for current build.

Rationale:

- the strategy corpus is informational only
- high-risk entries must not become personalized recommendations
- no dosing, procedural instructions, sourcing guidance, or escalation paths are allowed

## Open Launch Gates

### Share URLs

Current behavior:

- share links encode measurements into the URL query string
- users can clear measurement data from the current browser URL

Before public launch, decide:

- whether encoded measurement URLs are acceptable at all
- whether sharing should move to server-side opaque IDs
- whether shared links need expiration, redaction, or explicit warnings

### Target Library

Current behavior:

- target profiles are placeholder/archetype data
- uncertainty is visible in notes

Before public launch, decide:

- minimum target count
- source and estimation standards
- whether named fictional/real-person targets are acceptable
- how prominently uncertainty must appear

### Percentiles

Current behavior:

- percentiles use an approximate adult reference model
- output is labeled as not NHANES-calibrated

Before public launch, decide:

- whether scaffold percentiles should remain visible
- which reference population is acceptable
- whether demographic strata are useful or too privacy-sensitive

### Corpus Moderation

Current behavior:

- seed entries are illustrative and not source-reviewed
- imported entries can be reviewed locally
- clinical, surgical, pharmaceutical, and medical-adjacent entries are excluded from personalization by default

Before public launch, decide:

- what content categories are excluded entirely
- whether high-risk/high-efficacy entries need extra display friction
- who can approve clinical or surgical entries
- whether user-submitted entries are allowed

## Pre-Launch Verification

Before launch, run:

```powershell
.\verify.ps1
```

Then manually inspect:

- `review-screenshots/desktop.png`
- `review-screenshots/mobile.png`
- strategy corpus copy
- target profile uncertainty labels
- share-link behavior in a fresh browser profile
- privacy copy

