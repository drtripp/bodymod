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
