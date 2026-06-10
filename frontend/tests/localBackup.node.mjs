import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  loadUserCheckIns,
  loadUserFaceMeasurements,
  loadUserGoals,
  loadUserProtocols,
  loadUserWorkoutSessions,
  restoreUserBackupData
} from "../src/lib/account.js";
import {
  buildLocalBackupBundle,
  decryptLocalBackup,
  encryptLocalBackup,
  summarizeLocalBackupBundle
} from "../src/lib/localBackup.js";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto
  });
}

function installLocalStorageMock() {
  const entries = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return entries.has(key) ? entries.get(key) : null;
      },
      setItem(key, value) {
        entries.set(key, String(value));
      },
      removeItem(key) {
        entries.delete(key);
      }
    }
  };
}

function sampleBundle() {
  return buildLocalBackupBundle({
    account: {
      displayName: "Taylor",
      email: "taylor@example.com",
      personaId: "recomp-lifter",
      createdAt: "2026-06-01T00:00:00.000Z"
    },
    snapshots: [
      {
        id: "snapshot-1",
        createdAt: "2026-06-02T00:00:00.000Z",
        measurements: { height: 180, weight: 82, sex: "male" }
      }
    ],
    goals: [
      {
        id: "goal-1",
        accountId: "old-account",
        createdAt: "2026-06-02T00:00:00.000Z",
        label: "Shoulder goal"
      }
    ],
    protocols: [
      {
        id: "protocol-1",
        accountId: "old-account",
        createdAt: "2026-06-03T00:00:00.000Z",
        label: "Training block"
      }
    ],
    checkIns: [
      {
        id: "check-1",
        accountId: "old-account",
        type: "daily-weight",
        createdAt: "2026-06-04T00:00:00.000Z",
        weight: 82
      }
    ],
    workoutSessions: [
      {
        id: "workout-1",
        accountId: "old-account",
        createdAt: "2026-06-05T00:00:00.000Z",
        exerciseLabel: "Lateral raise"
      }
    ],
    photos: [
      {
        id: "photo-1",
        accountId: "old-account",
        createdAt: "2026-06-06T00:00:00.000Z",
        category: "body",
        fileName: "front.png",
        dataUrl: "data:image/png;base64,photo-data",
        note: "front pose"
      }
    ],
    faceMeasurements: [
      {
        id: "face-1",
        accountId: "old-account",
        createdAt: "2026-06-07T00:00:00.000Z",
        source: "photo"
      }
    ]
  });
}

test("builds backup bundles with photo manifests instead of image payloads", () => {
  const bundle = sampleBundle();
  const summary = summarizeLocalBackupBundle(bundle);

  assert.equal(bundle.photoManifest.length, 1);
  assert.equal(bundle.photoManifest[0].fileName, "front.png");
  assert.equal(bundle.photoManifest[0].hasImageData, true);
  assert.equal(JSON.stringify(bundle).includes("photo-data"), false);
  assert.deepEqual(summary, {
    snapshots: 1,
    goals: 1,
    protocols: 1,
    checkIns: 1,
    workoutSessions: 1,
    faceMeasurements: 1,
    photoManifest: 1
  });
});

test("encrypts and decrypts local backup bundles with a passphrase", async () => {
  const bundle = sampleBundle();
  const encrypted = await encryptLocalBackup(bundle, "correct horse battery staple");

  assert.equal(encrypted.includes("taylor@example.com"), false);
  assert.equal(encrypted.includes("Shoulder goal"), false);

  const decrypted = await decryptLocalBackup(encrypted, "correct horse battery staple");
  assert.equal(decrypted.account.email, "taylor@example.com");
  assert.equal(decrypted.checkIns[0].weight, 82);
});

test("rejects short or incorrect backup passphrases", async () => {
  const bundle = sampleBundle();
  await assert.rejects(() => encryptLocalBackup(bundle, "short"), /at least 8/);

  const encrypted = await encryptLocalBackup(bundle, "correct horse battery staple");
  await assert.rejects(
    () => decryptLocalBackup(encrypted, "wrong horse battery staple"),
    /decrypt failed/
  );
});

test("restores account-scoped backup data into the active account without duplicates", () => {
  installLocalStorageMock();
  const bundle = sampleBundle();

  const restored = restoreUserBackupData("new-account", bundle);
  const restoredAgain = restoreUserBackupData("new-account", bundle);

  assert.equal(restored.imported.checkIns, 1);
  assert.equal(restored.imported.photoManifest, 1);
  assert.equal(restoredAgain.imported.checkIns, 0);
  assert.deepEqual(loadUserCheckIns("new-account").map((item) => item.accountId), [
    "new-account"
  ]);
  assert.equal(loadUserGoals("new-account")[0].label, "Shoulder goal");
  assert.equal(loadUserProtocols("new-account")[0].label, "Training block");
  assert.equal(loadUserWorkoutSessions("new-account")[0].exerciseLabel, "Lateral raise");
  assert.equal(loadUserFaceMeasurements("new-account")[0].source, "photo");
});
