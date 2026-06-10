import assert from "node:assert/strict";
import test from "node:test";

import {
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
