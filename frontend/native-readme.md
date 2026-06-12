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
