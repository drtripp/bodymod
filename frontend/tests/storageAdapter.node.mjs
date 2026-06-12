import assert from "node:assert/strict";
import test from "node:test";

import {
  createCapacitorPreferencesAdapter,
  createMemoryStorageAdapter,
  readJson,
  readJsonSync,
  removeStoredItem,
  removeStoredItemSync,
  writeJson,
  writeJsonSync
} from "../src/lib/storageAdapter.js";
import {
  loadDietFoodLibrary,
  loadDietLog,
  loadSnapshots,
  persistDietFoodLibrary,
  persistDietLog,
  persistSnapshots
} from "../src/lib/storage.js";

function createFakePreferences(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    async keys() {
      return { keys: Array.from(entries.keys()) };
    },
    async get({ key }) {
      return { value: entries.has(key) ? entries.get(key) : null };
    },
    async set({ key, value }) {
      entries.set(key, String(value));
    },
    async remove({ key }) {
      entries.delete(key);
    },
    dump() {
      return Object.fromEntries(entries);
    }
  };
}

test("memory storage adapter supports the async JSON interface", async () => {
  const adapter = createMemoryStorageAdapter();

  await writeJson("bodymod:test", { version: 1, value: "ok" }, adapter);
  assert.deepEqual(await readJson("bodymod:test", null, adapter), {
    version: 1,
    value: "ok"
  });

  await removeStoredItem("bodymod:test", adapter);
  assert.equal(await readJson("bodymod:test", "missing", adapter), "missing");
});

test("storage helpers keep synchronous compatibility through the adapter", () => {
  const adapter = createMemoryStorageAdapter();

  writeJsonSync("bodymod:test", { version: 1, entries: [1, 2] }, adapter);
  assert.deepEqual(readJsonSync("bodymod:test", null, adapter), {
    version: 1,
    entries: [1, 2]
  });

  removeStoredItemSync("bodymod:test", adapter);
  assert.equal(readJsonSync("bodymod:test", "fallback", adapter), "fallback");
});

test("snapshot and diet persistence use adapter-backed storage", () => {
  const adapter = createMemoryStorageAdapter();
  const snapshots = [
    {
      id: "snapshot-1",
      createdAt: "2026-06-10T00:00:00.000Z",
      measurements: { height: 180, weight: 82, sex: "male" }
    }
  ];
  const entries = [
    {
      id: "food-1",
      loggedAt: "2026-06-10T12:00:00.000Z",
      name: "Rice bowl"
    }
  ];
  const library = {
    customFoods: [{ id: "custom-1", name: "Protein oats" }],
    favoriteFoods: ["custom-1"],
    recentFoods: ["custom-1"],
    mealTemplates: [{ id: "meal-1", name: "Breakfast" }]
  };

  persistSnapshots(snapshots, adapter);
  persistDietLog(entries, adapter);
  persistDietFoodLibrary(library, adapter);

  assert.deepEqual(loadSnapshots(adapter), snapshots);
  assert.deepEqual(loadDietLog(adapter), entries);
  assert.deepEqual(loadDietFoodLibrary(adapter), library);
});

test("malformed stored JSON returns safe fallbacks", () => {
  const adapter = createMemoryStorageAdapter({
    "bodymod:snapshots:v1": "{broken",
    "bodymod:diet-log:v1": JSON.stringify({ entries: "nope" })
  });

  assert.deepEqual(loadSnapshots(adapter), []);
  assert.deepEqual(loadDietLog(adapter), []);
});

test("Capacitor Preferences adapter hydrates native values and migrates bodymod web storage", async () => {
  const nativeSnapshots = {
    version: 1,
    snapshots: [
      {
        id: "native-snapshot",
        createdAt: "2026-06-11T00:00:00.000Z",
        measurements: { height: 181, weight: 80, sex: "male" }
      }
    ]
  };
  const webDietLog = {
    version: 1,
    entries: [{ id: "food-1", loggedAt: "2026-06-11T12:00:00.000Z", name: "Oats" }]
  };
  const preferences = createFakePreferences({
    "bodymod:snapshots:v1": JSON.stringify(nativeSnapshots)
  });
  const webAdapter = createMemoryStorageAdapter({
    "bodymod:snapshots:v1": JSON.stringify({ version: 1, snapshots: [] }),
    "bodymod:diet-log:v1": JSON.stringify(webDietLog),
    "unrelated:key": "do-not-migrate"
  });
  const adapter = createCapacitorPreferencesAdapter({ preferences, webAdapter });

  const hydration = await adapter.hydrate();

  assert.equal(hydration.hydrated, true);
  assert.equal(hydration.migratedCount, 1);
  assert.deepEqual(readJsonSync("bodymod:snapshots:v1", null, adapter), nativeSnapshots);
  assert.deepEqual(await readJson("bodymod:diet-log:v1", null, adapter), webDietLog);
  assert.equal(preferences.dump()["unrelated:key"], undefined);
});

test("Capacitor Preferences adapter mirrors async writes into its sync cache", async () => {
  const preferences = createFakePreferences();
  const adapter = createCapacitorPreferencesAdapter({ preferences });

  await writeJson("bodymod:native-cache-test:v1", { value: "ok" }, adapter);

  assert.deepEqual(readJsonSync("bodymod:native-cache-test:v1", null, adapter), {
    value: "ok"
  });
  assert.deepEqual(JSON.parse(preferences.dump()["bodymod:native-cache-test:v1"]), {
    value: "ok"
  });

  await removeStoredItem("bodymod:native-cache-test:v1", adapter);

  assert.equal(readJsonSync("bodymod:native-cache-test:v1", "missing", adapter), "missing");
  assert.equal(preferences.dump()["bodymod:native-cache-test:v1"], undefined);
});
