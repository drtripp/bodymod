import assert from "node:assert/strict";
import test from "node:test";

import { createNativeHapticsAdapter } from "../src/lib/haptics.js";

const nativeCapacitor = {
  isNativePlatform() {
    return true;
  }
};

test("native haptics adapter triggers success feedback only on native runtimes", async () => {
  const calls = [];
  const adapter = createNativeHapticsAdapter({
    capacitor: nativeCapacitor,
    haptics: {
      async notification(options) {
        calls.push(options);
      }
    }
  });

  const result = await adapter.notifyCheckInSaved();

  assert.equal(adapter.isAvailable(), true);
  assert.deepEqual(result, { triggered: true });
  assert.deepEqual(calls, [{ type: "SUCCESS" }]);
});

test("native haptics adapter stays quiet outside Capacitor native runtime", async () => {
  const adapter = createNativeHapticsAdapter({
    capacitor: {
      isNativePlatform() {
        return false;
      }
    },
    haptics: {
      async notification() {
        throw new Error("should not be called");
      }
    }
  });

  assert.equal(adapter.isAvailable(), false);
  assert.deepEqual(await adapter.notifyCheckInSaved(), {
    triggered: false,
    reason: "unsupported"
  });
});

test("native haptics adapter does not throw when device feedback fails", async () => {
  const adapter = createNativeHapticsAdapter({
    capacitor: nativeCapacitor,
    haptics: {
      async notification() {
        throw new Error("haptic engine unavailable");
      }
    }
  });

  assert.deepEqual(await adapter.notifyCheckInSaved(), {
    triggered: false,
    reason: "failed"
  });
});
