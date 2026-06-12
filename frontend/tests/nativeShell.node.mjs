import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createNativeShellAdapter,
  NATIVE_SHELL_THEME_COLOR,
  NATIVE_SPLASH_FADE_MS
} from "../src/lib/nativeShell.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");

function nativeCapacitor() {
  return {
    isNativePlatform() {
      return true;
    }
  };
}

function documentStub() {
  const classes = new Set();
  return {
    classes,
    documentElement: {
      classList: {
        add(value) {
          classes.add(value);
        }
      }
    }
  };
}

test("native shell adapter configures status bar and hides splash on native runtime", async () => {
  const calls = [];
  const documentRef = documentStub();
  const adapter = createNativeShellAdapter({
    capacitor: nativeCapacitor(),
    documentRef,
    statusBar: {
      async setOverlaysWebView(options) {
        calls.push(["setOverlaysWebView", options]);
      },
      async setStyle(options) {
        calls.push(["setStyle", options]);
      },
      async setBackgroundColor(options) {
        calls.push(["setBackgroundColor", options]);
      },
      async show(options) {
        calls.push(["show", options]);
      }
    },
    splashScreen: {
      async hide(options) {
        calls.push(["hideSplash", options]);
      }
    }
  });

  const result = await adapter.configure();

  assert.equal(adapter.isAvailable(), true);
  assert.equal(result.configured, true);
  assert.equal(documentRef.classes.has("is-native-shell"), true);
  assert.deepEqual(calls, [
    ["setOverlaysWebView", { overlay: false }],
    ["setStyle", { style: "LIGHT" }],
    ["setBackgroundColor", { color: NATIVE_SHELL_THEME_COLOR }],
    ["show", { animation: "NONE" }],
    ["hideSplash", { fadeOutDuration: NATIVE_SPLASH_FADE_MS }]
  ]);
});

test("native shell adapter is a no-op outside Capacitor native runtime", async () => {
  const adapter = createNativeShellAdapter({
    capacitor: {
      isNativePlatform() {
        return false;
      }
    },
    statusBar: {
      async setStyle() {
        throw new Error("should not be called");
      }
    },
    splashScreen: {
      async hide() {
        throw new Error("should not be called");
      }
    }
  });

  assert.deepEqual(await adapter.configure(), {
    configured: false,
    reason: "unsupported"
  });
});

test("native shell metadata ships manifest, icon, and safe-area viewport", () => {
  const index = readFileSync(join(frontendRoot, "index.html"), "utf8");
  const manifest = JSON.parse(
    readFileSync(join(frontendRoot, "public", "manifest.webmanifest"), "utf8")
  );
  const css = readFileSync(join(frontendRoot, "src", "styles.css"), "utf8");
  const iconPath = join(frontendRoot, "public", "app-icons", "bodymod-icon.svg");

  assert.match(index, /viewport-fit=cover/);
  assert.match(index, /name="theme-color" content="#f3efe6"/);
  assert.match(index, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, NATIVE_SHELL_THEME_COLOR);
  assert.equal(manifest.icons[0].src, "/app-icons/bodymod-icon.svg");
  assert.equal(existsSync(iconPath), true);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
});
