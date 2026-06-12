import { Capacitor } from "@capacitor/core";
import {
  BarcodeFormat,
  BarcodeScanner
} from "@capacitor-mlkit/barcode-scanning";
import { isNativeCapacitorRuntime } from "./storageAdapter.js";

export const PRODUCT_BARCODE_FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128
];

const grantedPermissionStates = new Set(["granted", "limited"]);

export function normalizeScannedBarcode(barcodes = []) {
  for (const barcode of barcodes) {
    const rawValue = String(barcode?.rawValue || barcode?.displayValue || "").trim();
    const value = rawValue.replace(/\D/g, "");

    if (value) {
      return {
        value,
        rawValue,
        format: barcode?.format || "",
        source: "native-mlkit"
      };
    }
  }

  throw new Error("No product barcode was found.");
}

async function ensureNativeScannerSupported(barcodeScanner) {
  if (typeof barcodeScanner.isSupported === "function") {
    const { supported } = await barcodeScanner.isSupported();
    if (!supported) {
      throw new Error("Native barcode scanning is not supported on this device.");
    }
  }

  if (typeof barcodeScanner.isGoogleBarcodeScannerModuleAvailable !== "function") {
    return;
  }

  let moduleAvailability = null;
  try {
    moduleAvailability = await barcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  } catch (error) {
    return;
  }

  if (moduleAvailability?.available === false) {
    if (typeof barcodeScanner.installGoogleBarcodeScannerModule === "function") {
      await barcodeScanner.installGoogleBarcodeScannerModule();
    }
    throw new Error("Native barcode scanner module is installing. Try again in a moment.");
  }
}

async function ensureCameraPermission(barcodeScanner) {
  if (typeof barcodeScanner.checkPermissions !== "function") {
    return;
  }

  const currentPermission = await barcodeScanner.checkPermissions();
  if (grantedPermissionStates.has(currentPermission?.camera)) {
    return;
  }

  if (typeof barcodeScanner.requestPermissions !== "function") {
    throw new Error("Camera permission is required for native barcode scanning.");
  }

  const requestedPermission = await barcodeScanner.requestPermissions();
  if (!grantedPermissionStates.has(requestedPermission?.camera)) {
    throw new Error("Camera permission is required for native barcode scanning.");
  }
}

export function createNativeBarcodeScannerAdapter({
  barcodeScanner = BarcodeScanner,
  capacitor = Capacitor,
  formats = PRODUCT_BARCODE_FORMATS
} = {}) {
  return {
    name: "native-mlkit-barcode-scanner",
    isNativeScannerAvailable() {
      return isNativeCapacitorRuntime(capacitor);
    },
    async scanBarcode() {
      if (!this.isNativeScannerAvailable()) {
        throw new Error("Native barcode scanner is not available.");
      }

      await ensureNativeScannerSupported(barcodeScanner);
      await ensureCameraPermission(barcodeScanner);

      const result = await barcodeScanner.scan({
        formats,
        autoZoom: true
      });

      return normalizeScannedBarcode(result?.barcodes);
    }
  };
}

export const defaultBarcodeScannerAdapter = createNativeBarcodeScannerAdapter();
