import assert from "node:assert/strict";
import test from "node:test";

import {
  createNativeBarcodeScannerAdapter,
  normalizeScannedBarcode,
  PRODUCT_BARCODE_FORMATS
} from "../src/lib/barcodeScanner.js";

const nativeCapacitor = {
  isNativePlatform() {
    return true;
  }
};

test("normalizes scanned product barcodes to numeric lookup values", () => {
  const scanned = normalizeScannedBarcode([
    {
      rawValue: "UPC 012345678905",
      displayValue: "ignored",
      format: "UPC_A"
    }
  ]);

  assert.deepEqual(scanned, {
    value: "012345678905",
    rawValue: "UPC 012345678905",
    format: "UPC_A",
    source: "native-mlkit"
  });
  assert.throws(() => normalizeScannedBarcode([{ rawValue: "not food" }]), /No product barcode/);
});

test("native barcode adapter checks support, requests permission, and scans with product formats", async () => {
  const calls = [];
  const fakeScanner = {
    async isSupported() {
      calls.push("isSupported");
      return { supported: true };
    },
    async isGoogleBarcodeScannerModuleAvailable() {
      calls.push("isGoogleBarcodeScannerModuleAvailable");
      return { available: true };
    },
    async checkPermissions() {
      calls.push("checkPermissions");
      return { camera: "prompt" };
    },
    async requestPermissions() {
      calls.push("requestPermissions");
      return { camera: "granted" };
    },
    async scan(options) {
      calls.push(["scan", options]);
      return {
        barcodes: [
          {
            rawValue: "1234567890123",
            displayValue: "1234567890123",
            format: "EAN_13"
          }
        ]
      };
    }
  };
  const adapter = createNativeBarcodeScannerAdapter({
    barcodeScanner: fakeScanner,
    capacitor: nativeCapacitor
  });

  const scanned = await adapter.scanBarcode();

  assert.equal(adapter.isNativeScannerAvailable(), true);
  assert.equal(scanned.value, "1234567890123");
  assert.deepEqual(calls.slice(0, 4), [
    "isSupported",
    "isGoogleBarcodeScannerModuleAvailable",
    "checkPermissions",
    "requestPermissions"
  ]);
  assert.deepEqual(calls[4], [
    "scan",
    {
      formats: PRODUCT_BARCODE_FORMATS,
      autoZoom: true
    }
  ]);
});

test("native barcode adapter stays unavailable outside Capacitor native runtime", async () => {
  const adapter = createNativeBarcodeScannerAdapter({
    barcodeScanner: {},
    capacitor: {
      isNativePlatform() {
        return false;
      }
    }
  });

  assert.equal(adapter.isNativeScannerAvailable(), false);
  await assert.rejects(() => adapter.scanBarcode(), /not available/);
});

test("native barcode adapter starts Google scanner module install when missing", async () => {
  const calls = [];
  const adapter = createNativeBarcodeScannerAdapter({
    capacitor: nativeCapacitor,
    barcodeScanner: {
      async isSupported() {
        return { supported: true };
      },
      async isGoogleBarcodeScannerModuleAvailable() {
        return { available: false };
      },
      async installGoogleBarcodeScannerModule() {
        calls.push("installGoogleBarcodeScannerModule");
      }
    }
  });

  await assert.rejects(() => adapter.scanBarcode(), /module is installing/);
  assert.deepEqual(calls, ["installGoogleBarcodeScannerModule"]);
});
