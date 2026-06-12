import { Capacitor } from "@capacitor/core";
import { Animation, StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { isNativeCapacitorRuntime } from "./storageAdapter.js";

export const NATIVE_SHELL_THEME_COLOR = "#f3efe6";
export const NATIVE_SPLASH_FADE_MS = 160;

function documentElement(documentRef) {
  return documentRef?.documentElement || null;
}

async function attempt(operation) {
  try {
    await operation();
    return true;
  } catch (error) {
    return false;
  }
}

export function createNativeShellAdapter({
  capacitor = Capacitor,
  statusBar = StatusBar,
  splashScreen = SplashScreen,
  documentRef = typeof document === "undefined" ? null : document
} = {}) {
  return {
    name: "native-shell",
    isAvailable() {
      return isNativeCapacitorRuntime(capacitor);
    },
    async configure() {
      if (!this.isAvailable()) {
        return {
          configured: false,
          reason: "unsupported"
        };
      }

      documentElement(documentRef)?.classList.add("is-native-shell");

      const results = {
        overlaysWebView: false,
        style: false,
        backgroundColor: false,
        shown: false,
        splashHidden: false
      };

      if (typeof statusBar?.setOverlaysWebView === "function") {
        results.overlaysWebView = await attempt(() =>
          statusBar.setOverlaysWebView({ overlay: false })
        );
      }

      if (typeof statusBar?.setStyle === "function") {
        results.style = await attempt(() => statusBar.setStyle({ style: Style.Light }));
      }

      if (typeof statusBar?.setBackgroundColor === "function") {
        results.backgroundColor = await attempt(() =>
          statusBar.setBackgroundColor({ color: NATIVE_SHELL_THEME_COLOR })
        );
      }

      if (typeof statusBar?.show === "function") {
        results.shown = await attempt(() => statusBar.show({ animation: Animation.None }));
      }

      if (typeof splashScreen?.hide === "function") {
        results.splashHidden = await attempt(() =>
          splashScreen.hide({ fadeOutDuration: NATIVE_SPLASH_FADE_MS })
        );
      }

      return {
        configured: true,
        results
      };
    }
  };
}

export const defaultNativeShellAdapter = createNativeShellAdapter();

export async function configureNativeShell({ adapter = defaultNativeShellAdapter } = {}) {
  return adapter.configure();
}
