import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  loadUserCheckIns,
  loadUserBloodworkResults,
  loadUserFaceMeasurements,
  loadUserGoals,
  loadUserProcedures,
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
import {
  buildPlainJsonExport,
  serializePlainJsonExport,
  summarizePlainJsonExport
} from "../src/lib/localExport.js";

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
      },
      {
        id: "cycle-1",
        accountId: "old-account",
        type: "cycle-phase",
        createdAt: "2026-06-04T12:00:00.000Z",
        phase: "luteal",
        cycleDay: 24,
        localOnlySensitive: true
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
    procedures: [
      {
        id: "procedure-1",
        accountId: "old-account",
        createdAt: "2026-06-05T12:00:00.000Z",
        label: "Large tattoo session",
        procedureDate: "2026-06-05",
        healingDays: 28
      }
    ],
    bloodworkResults: [
      {
        id: "blood-1",
        accountId: "old-account",
        createdAt: "2026-06-05T14:00:00.000Z",
        markerLabel: "LDL-C",
        value: 92,
        unit: "mg/dL",
        localOnlySensitive: true
      }
    ],
    referralCredits: [
      {
        id: "referral-1",
        accountId: "old-account",
        createdAt: "2026-06-05T16:00:00.000Z",
        referralCode: "BM-FRIEND1",
        rewardLabel: "1 Pro month",
        status: "local-pending",
        localOnly: true
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
    checkIns: 2,
    workoutSessions: 1,
    procedures: 1,
    bloodworkResults: 1,
    referralCredits: 1,
    faceMeasurements: 1,
    photoManifest: 1
  });
});

test("builds readable JSON exports with or without an account", () => {
  const signedOutExport = buildPlainJsonExport({
    snapshots: [{ id: "snapshot-1", createdAt: "2026-06-01", measurements: {} }],
    goals: [{ id: "goal-ignored" }],
    dietLog: [{ id: "food-1", name: "Oats" }],
    dietFoodLibrary: {
      customFoods: [{ id: "custom-1", name: "Protein oats" }],
      favoriteFoods: ["custom-1"],
      recentFoods: ["custom-1"],
      mealTemplates: [{ id: "meal-1", name: "Breakfast" }]
    },
    fluidLog: [{ id: "fluid-1", amountMl: 500 }],
    proWaitlistSignups: [{ email: "wait@example.com" }]
  });
  const signedInExport = buildPlainJsonExport({
    account: { displayName: "Taylor", email: "taylor@example.com" },
    snapshots: [{ id: "snapshot-1", createdAt: "2026-06-01", measurements: {} }],
    goals: [{ id: "goal-1" }],
    checkIns: [{ id: "check-1", type: "cycle-phase" }],
    procedures: [{ id: "procedure-1", label: "Large tattoo session" }],
    bloodworkResults: [{ id: "blood-1", markerLabel: "LDL-C", value: 92 }],
    referralCredits: [{ id: "referral-1", referralCode: "BM-FRIEND1" }],
    photos: [{ id: "photo-1", dataUrl: "data:image/png;base64,secret", fileName: "front.png" }],
    dietLog: [],
    dietFoodLibrary: {},
    fluidLog: []
  });
  const serializedSignedIn = serializePlainJsonExport(signedInExport);

  assert.equal(signedOutExport.kind, "bodymod.local-json-export");
  assert.equal(signedOutExport.account, null);
  assert.deepEqual(signedOutExport.accountData.goals, []);
  assert.equal(signedOutExport.diet.entries[0].name, "Oats");
  assert.equal(signedOutExport.diet.fluidEntries[0].amountMl, 500);
  assert.equal(signedOutExport.proWaitlistSignups[0].email, "wait@example.com");
  assert.deepEqual(summarizePlainJsonExport(signedOutExport), {
    snapshots: 1,
    goals: 0,
    protocols: 0,
    checkIns: 0,
    workoutSessions: 0,
    procedures: 0,
    bloodworkResults: 0,
    referralCredits: 0,
    faceMeasurements: 0,
    photoManifest: 0,
    dietEntries: 1,
    fluidEntries: 1,
    customFoods: 1,
    mealTemplates: 1,
    proWaitlistSignups: 1
  });
  assert.equal(signedInExport.accountData.goals.length, 1);
  assert.equal(signedInExport.accountData.checkIns[0].type, "cycle-phase");
  assert.equal(signedInExport.accountData.procedures[0].label, "Large tattoo session");
  assert.equal(signedInExport.accountData.bloodworkResults[0].markerLabel, "LDL-C");
  assert.equal(signedInExport.accountData.referralCredits[0].referralCode, "BM-FRIEND1");
  assert.equal(signedInExport.accountData.photoManifest[0].hasImageData, true);
  assert.equal(serializedSignedIn.includes("secret"), false);
});

test("encrypts and decrypts local backup bundles with a passphrase", async () => {
  const bundle = sampleBundle();
  const encrypted = await encryptLocalBackup(bundle, "correct horse battery staple");

  assert.equal(encrypted.includes("taylor@example.com"), false);
  assert.equal(encrypted.includes("Shoulder goal"), false);

  const decrypted = await decryptLocalBackup(encrypted, "correct horse battery staple");
  assert.equal(decrypted.account.email, "taylor@example.com");
  assert.equal(decrypted.checkIns[0].weight, 82);
  assert.equal(decrypted.checkIns[1].type, "cycle-phase");
  assert.equal(decrypted.checkIns[1].localOnlySensitive, true);
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

  assert.equal(restored.imported.checkIns, 2);
  assert.equal(restored.imported.procedures, 1);
  assert.equal(restored.imported.bloodworkResults, 1);
  assert.equal(restored.imported.photoManifest, 1);
  assert.equal(restoredAgain.imported.checkIns, 0);
  assert.deepEqual(loadUserCheckIns("new-account").map((item) => item.accountId), [
    "new-account",
    "new-account"
  ]);
  assert.equal(loadUserGoals("new-account")[0].label, "Shoulder goal");
  assert.equal(loadUserProtocols("new-account")[0].label, "Training block");
  assert.equal(loadUserWorkoutSessions("new-account")[0].exerciseLabel, "Lateral raise");
  assert.equal(loadUserProcedures("new-account")[0].label, "Large tattoo session");
  assert.equal(loadUserBloodworkResults("new-account")[0].markerLabel, "LDL-C");
  assert.equal(loadUserFaceMeasurements("new-account")[0].source, "photo");
});
