const BACKUP_VERSION = 1;
const BACKUP_KIND = "bodymod.encrypted-local-backup";
const KDF_ITERATIONS = 150000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function getCrypto() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("Web Crypto is required for encrypted backups.");
  }

  return cryptoApi;
}

function bytesToBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  if (typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(value, "base64"));
}

function normalizePassphrase(passphrase) {
  const text = String(passphrase || "");
  if (text.length < 8) {
    throw new Error("Backup passphrase must be at least 8 characters.");
  }
  return text;
}

async function deriveKey(passphrase, salt) {
  const cryptoApi = getCrypto();
  const encodedPassphrase = new TextEncoder().encode(normalizePassphrase(passphrase));
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    encodedPassphrase,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: KDF_ITERATIONS
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function photoManifest(photos = []) {
  return safeArray(photos).map((photo) => ({
    id: photo.id,
    createdAt: photo.createdAt,
    category: photo.category,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    size: photo.size,
    note: photo.note,
    hasImageData: Boolean(photo.dataUrl)
  }));
}

export function buildLocalBackupBundle({
  account = null,
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  procedures = [],
  bloodworkResults = [],
  referralCredits = [],
  photos = [],
  faceMeasurements = []
} = {}) {
  return {
    version: BACKUP_VERSION,
    kind: "bodymod.local-backup-bundle",
    exportedAt: new Date().toISOString(),
    account: account
      ? {
          displayName: account.displayName,
          email: account.email,
          personaId: account.personaId,
          createdAt: account.createdAt
        }
      : null,
    snapshots: safeArray(snapshots),
    goals: safeArray(goals),
    protocols: safeArray(protocols),
    checkIns: safeArray(checkIns),
    workoutSessions: safeArray(workoutSessions),
    procedures: safeArray(procedures),
    bloodworkResults: safeArray(bloodworkResults),
    referralCredits: safeArray(referralCredits),
    faceMeasurements: safeArray(faceMeasurements),
    photoManifest: photoManifest(photos),
    notes: [
      "Photo image data is not included. The backup keeps only a local photo manifest."
    ]
  };
}

export function normalizeLocalBackupBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("Backup payload is invalid.");
  }

  return {
    version: Number(bundle.version || BACKUP_VERSION),
    kind: bundle.kind || "bodymod.local-backup-bundle",
    exportedAt: bundle.exportedAt || null,
    account: bundle.account || null,
    snapshots: safeArray(bundle.snapshots),
    goals: safeArray(bundle.goals),
    protocols: safeArray(bundle.protocols),
    checkIns: safeArray(bundle.checkIns),
    workoutSessions: safeArray(bundle.workoutSessions),
    procedures: safeArray(bundle.procedures),
    bloodworkResults: safeArray(bundle.bloodworkResults),
    referralCredits: safeArray(bundle.referralCredits),
    faceMeasurements: safeArray(bundle.faceMeasurements),
    photoManifest: safeArray(bundle.photoManifest),
    notes: safeArray(bundle.notes)
  };
}

export async function encryptLocalBackup(bundle, passphrase) {
  const cryptoApi = getCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(
    JSON.stringify(normalizeLocalBackupBundle(bundle))
  );
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    plaintext
  );

  return JSON.stringify(
    {
      version: BACKUP_VERSION,
      kind: BACKUP_KIND,
      encryptedAt: new Date().toISOString(),
      algorithm: "AES-GCM",
      kdf: {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: KDF_ITERATIONS
      },
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(encrypted))
    },
    null,
    2
  );
}

export async function decryptLocalBackup(rawValue, passphrase) {
  const parsed = JSON.parse(String(rawValue || ""));
  if (parsed.kind !== BACKUP_KIND || parsed.algorithm !== "AES-GCM") {
    throw new Error("Choose a bodymod encrypted backup file.");
  }

  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await getCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );
    const decoded = new TextDecoder().decode(decrypted);
    return normalizeLocalBackupBundle(JSON.parse(decoded));
  } catch (error) {
    throw new Error("Backup decrypt failed. Check the passphrase and file.");
  }
}

export function summarizeLocalBackupBundle(bundle) {
  const normalized = normalizeLocalBackupBundle(bundle);
  return {
    snapshots: normalized.snapshots.length,
    goals: normalized.goals.length,
    protocols: normalized.protocols.length,
    checkIns: normalized.checkIns.length,
    workoutSessions: normalized.workoutSessions.length,
    procedures: normalized.procedures.length,
    bloodworkResults: normalized.bloodworkResults.length,
    referralCredits: normalized.referralCredits.length,
    faceMeasurements: normalized.faceMeasurements.length,
    photoManifest: normalized.photoManifest.length
  };
}
