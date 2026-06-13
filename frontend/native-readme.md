# Native Shell Bootstrap

This folder is still a Vite web app first. Capacitor is installed only as a
wrapper scaffold until the Android/iOS project folders are generated on a
machine with the right native toolchains.

## Scripts

```bash
npm run native:add:android
npm run native:add:ios
npm run native:sync
```

Use `native:add:*` once per platform after Android Studio/Xcode setup. Use
`native:sync` after web changes; it builds `dist/` and syncs the web bundle into
the native shell.

For device testing, set `VITE_API_BASE_URL` before `npm run native:sync` to an
API URL reachable from the device or emulator. The backend default CORS list
includes `capacitor://localhost` for the native shell.

## Shell Polish

`src/lib/nativeShell.js` configures `@capacitor/status-bar` and
`@capacitor/splash-screen` after the React app is handed to the root. Native
runtimes keep the status bar visible, non-overlaid, styled for the cafe light
background, and then hide the splash screen with a short fade. Browser builds
skip the adapter.

`src/styles.css` uses `env(safe-area-inset-*)` on the app shell, skip link, and
account overlay so notches and home indicators do not cover controls.
`index.html` opts into `viewport-fit=cover`, sets the theme color, links
`public/manifest.webmanifest`, and reuses `public/app-icons/bodymod-icon.svg`
for the installable web icon. Store-ready PNG icon generation remains tied to
generated Android/iOS project folders.

## Storage

The app uses `@capacitor/preferences` through `src/lib/storageAdapter.js` when
`Capacitor.isNativePlatform()` is true. Startup waits for adapter hydration so
the existing synchronous React state initializers can read from a native-backed
cache. Hydration also migrates existing `bodymod:` webview `localStorage` keys
into Preferences once.

Progress-photo bytes use `@capacitor/filesystem` through
`src/lib/photoStorage.js` in native runtimes. The account store keeps only
photo metadata plus a local file reference, then hydrates file-backed photos
back into preview data URLs for the gallery/comparison UI. Browser builds keep
the existing inline `localStorage` behavior for local-only web photos.

Encrypted local backup files use the same plugin through
`src/lib/nativeBackup.js`. The account panel can write, restore, and delete the
latest passphrase-encrypted backup at
`bodymod-encrypted-backups/latest.bodymod-encrypted-backup.json` in
`Directory.Data`; it also keeps metadata and a session-autosave preference in
the storage adapter. The saved file is already AES-GCM encrypted and contains
photo manifests only, not photo bytes. Actual iCloud/Google Drive backup policy
still requires generated native project folders and platform-specific backup
rules.

## Barcode Scanning

Diet barcode scanning uses `@capacitor-mlkit/barcode-scanning` through
`src/lib/barcodeScanner.js` when running in a native Capacitor runtime. Browser
builds keep the existing camera + `BarcodeDetector` path when available and
manual UPC/EAN entry remains the fallback everywhere. On Android, the adapter
starts Google Barcode Scanner module installation when the module is missing
and asks the user to retry after installation.

## Health Data Sync

`src/lib/healthSync.js` prepares a native-health write batch for future
HealthKit / Health Connect integration. The account panel can build a preview
from local daily weights, current and saved measurements, logged workouts,
nutrition-day totals, and fluid-day totals. The persisted
`bodymod:health-sync:v1` state stores metadata only: counts, timestamps,
destination labels, and privacy copy. It does not persist health values,
account emails, local account IDs, notes, food names, or photo data.

Actual native reads/writes still require generated iOS/Android projects, plugin
selection, platform permissions, App Store / Play policy review, and device
validation. Browser builds use the unavailable adapter and do not write data.

## Live Update Manifest

`backend/app/data/live_updates.seed.json` and `/api/live-updates/manifest`
provide a review-only channel manifest so the account panel can compare the
running web/native shell version with backend release metadata. The local check
state stores only version, channel, provider-review, and rollout metadata.

This is not a production live-update provider. Capgo, self-hosted bundles, or
another option still require signing, staged rollout, rollback policy,
privacy/provider review, and app-store policy review before shipping.

## Push And Haptics

Remote stale-trend reminders use `@capacitor/push-notifications` in native
Capacitor runtimes. The account-panel reminder control requests native receive
permission, registers the APNs/FCM token, and posts only the token, platform,
context, created timestamp, and timestamp-only `nextReminderAfter` schedule to
`/api/native-push/tokens`. Unsubscribe revokes the backend row by token hash.
No measurement payload is accepted by the native push endpoint.

Backend native delivery is still configuration-gated. Android delivery expects
either `BODYMOD_FCM_SERVICE_ACCOUNT_JSON` or `BODYMOD_FCM_SERVER_KEY`. iOS
delivery expects `BODYMOD_APNS_KEY_ID`, `BODYMOD_APNS_TEAM_ID`,
`BODYMOD_APNS_BUNDLE_ID`, and `BODYMOD_APNS_AUTH_KEY`. Until those are set and
a sender job is scheduled, the app can save native subscriptions but the backend
reports delivery as not configured.

The backend sender is dry-runable:

```bash
cd ../backend
.\.venv\Scripts\python.exe scripts\send_native_trend_push_reminders.py --dry-run
```

Without `--dry-run`, the worker inspects due native token rows, skips platforms
without provider credentials, and records sent/failed delivery state without
reading measurement or account data. FCM service-account JSON can be supplied
directly in `BODYMOD_FCM_SERVICE_ACCOUNT_JSON` or as a path to the JSON file;
legacy `BODYMOD_FCM_SERVER_KEY` is also supported for test deployments. Set
`BODYMOD_APNS_USE_SANDBOX=true` for iOS sandbox device tokens.

Successful account check-in saves call `@capacitor/haptics` in native runtimes.
The haptic call is best-effort and ignored on web or unsupported devices.

## Home-Screen Widget Payload

`src/lib/widgetSnapshot.js` writes `bodymod:home-widget-snapshot:v1` through the
same storage adapter used by the app. Browser builds store it in localStorage;
native Capacitor builds store it through Preferences. The payload is designed
for future iOS/Android widget extensions and intentionally contains only:

- weekly streak count/status/label
- next weekly check-in label/date
- daily-log status text
- updated timestamp and action label

It does not include account email, notes, photos, or raw body values. Real iOS
WidgetKit / Android Glance extensions still require generated native project
folders and platform-specific app-group/shared-storage wiring.
