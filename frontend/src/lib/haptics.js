import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { isNativeCapacitorRuntime } from "./storageAdapter.js";

export function createNativeHapticsAdapter({
  capacitor = Capacitor,
  haptics = Haptics
} = {}) {
  return {
    name: "native-haptics",
    isAvailable() {
      return (
        isNativeCapacitorRuntime(capacitor) &&
        typeof haptics?.notification === "function"
      );
    },
    async notifyCheckInSaved() {
      if (!this.isAvailable()) {
        return {
          triggered: false,
          reason: "unsupported"
        };
      }

      try {
        await haptics.notification({ type: NotificationType.Success });
        return {
          triggered: true
        };
      } catch (error) {
        return {
          triggered: false,
          reason: "failed"
        };
      }
    }
  };
}

export const defaultHapticsAdapter = createNativeHapticsAdapter();

export function notifyCheckInSaved({ adapter = defaultHapticsAdapter } = {}) {
  return adapter.notifyCheckInSaved();
}
