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

## Barcode Scanning

Diet barcode scanning uses `@capacitor-mlkit/barcode-scanning` through
`src/lib/barcodeScanner.js` when running in a native Capacitor runtime. Browser
builds keep the existing camera + `BarcodeDetector` path when available and
manual UPC/EAN entry remains the fallback everywhere. On Android, the adapter
starts Google Barcode Scanner module installation when the module is missing
and asks the user to retry after installation.

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
a sender job is added, the app can save native subscriptions but the backend
reports delivery as not configured.

Successful account check-in saves call `@capacitor/haptics` in native runtimes.
The haptic call is best-effort and ignored on web or unsupported devices.
