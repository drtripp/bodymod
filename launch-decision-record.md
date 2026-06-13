# Launch Decision Record

This document captures decisions that must be made before treating the current
prototype as a public product.

The current app is local-first and measurement-first. It does not include an
approved production account system, photo uploads, external analytics,
production corpus content, or default server-side sync.

## Current Decisions

### Accounts

Status: not approved for current build.

Rationale:

- local snapshots satisfy the current private-use loop
- production accounts would add sensitive data custody before there is a clear
  user need
- cross-device sync can be revisited after local retention proves useful

Current scaffold:

- backend magic-link identity endpoints can request/verify one-time links, read
  a bearer session, and revoke the session
- the scaffold stores email/link/session secrets as hashes and exposes a local
  dev-token mode for verification
- a generic SMTP sender can deliver clickable `magicLinkToken` URLs without
  returning raw login tokens in JSON responses
- the account-panel preview sends only email/display-name/user-agent metadata;
  measurements and logs remain local unless the separate encrypted sync tools
  are used

### Photo Or Vision Uploads

Status: not approved for current build.

Rationale:

- raw body images are privacy-sensitive
- model licensing and biometric-processing questions are unresolved
- manual measurement entry is the current first-class workflow

### External Analytics

Status: not approved for current build.

Rationale:

- current telemetry is local-only in browser storage unless an explicit build
  flag enables the first-party minimized analytics sink
- production analytics need a provider/hosting privacy review
- measurement data should not be sent to analytics providers by default
- the implemented first-party analytics envelope has allowlisted event names,
  sanitized routes, anonymous session IDs, and no arbitrary properties

### Remote Notifications

Status: scaffolded, not enabled for public launch.

Rationale:

- local browser reminders exist without creating server-side user data custody
- remote web push requires storing browser push endpoints and VAPID keys
- the implemented subscription API accepts only the push subscription envelope,
  user-agent family, timestamp, and trend-stale context
- production launch still needs a delivery schedule, unsubscribe review, and
  privacy copy before remote reminders are enabled

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
- signed-in local accounts can publish an opt-in server-side read-only
  dashboard behind an opaque public token and a browser-held revoke token
- share-dashboard payloads omit account email, local account IDs, notes, photo
  files, and face scan images

Before public launch, decide:

- whether encoded measurement URLs are acceptable at all
- whether encoded measurement URLs should remain alongside server-side opaque
  dashboard links
- whether shared dashboard links need expiration, redaction presets, or
  stronger explicit warnings

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

- height, weight, waist, and hip percentiles use the NHANES August 2021-August
  2023 adult overlay
- unsupported fields still use a labeled approximate scaffold

Before public launch, decide:

- whether scaffold percentiles should remain visible
- which reference population is acceptable
- whether demographic strata are useful or too privacy-sensitive

### Corpus Moderation

Current behavior:

- seed entries are illustrative and not source-reviewed
- imported entries can be reviewed locally
- generated local protocol case logs can be submitted to a review-only backend
  queue, but queued submissions are not public and are not merged into the
  corpus automatically
- clinical, surgical, pharmaceutical, and medical-adjacent entries are excluded from personalization by default

Before public launch, decide:

- what content categories are excluded entirely
- whether high-risk/high-efficacy entries need extra display friction
- who can approve clinical or surgical entries
- whether user-submitted entries are allowed
- what reviewer tooling, consent language, and publication policy apply to
  queued case-log submissions

### Legal Pages

Current behavior:

- draft privacy, terms, and medical disclaimer pages exist under `/legal/`
- the drafts describe the current local-first prototype and unresolved launch gates

Before public launch, decide:

- final legal owner/entity and contact details
- jurisdiction and consumer-rights language
- whether medical-disclaimer wording is sufficient for corpus, diet, workout, face, and procedure-adjacent content
- whether accounts, payments, analytics, native apps, or sync require additional terms

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
- draft legal pages under `/legal/`
