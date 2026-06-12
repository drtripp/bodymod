import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPhotoRecord,
  defaultPhotoComparison,
  photoCategoryCounts,
  photosForCategory,
  sortPhotosNewest
} from "../src/lib/photos.js";
import {
  createCapacitorPhotoAssetAdapter,
  PHOTO_ASSET_STORAGE_KIND
} from "../src/lib/photoStorage.js";
import {
  deleteUserPhotoAsset,
  hydrateUserPhotoAssets,
  loadUserPhotos,
  persistUserPhotoAsset
} from "../src/lib/account.js";

const imageData = "data:image/svg+xml;base64,PHN2Zy8+";

function createFakeFilesystem() {
  const entries = new Map();

  return {
    async writeFile({ path, data }) {
      entries.set(path, String(data));
      return { uri: `fake://${path}` };
    },
    async readFile({ path }) {
      if (!entries.has(path)) {
        throw new Error("File not found.");
      }
      return { data: entries.get(path) };
    },
    async deleteFile({ path }) {
      entries.delete(path);
    },
    dump() {
      return Object.fromEntries(entries);
    }
  };
}

function installLocalStorageMock() {
  const entries = new Map();
  globalThis.window = {
    localStorage: {
      get length() {
        return entries.size;
      },
      key(index) {
        return Array.from(entries.keys())[index] || null;
      },
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

test("creates local-only photo records and normalizes categories", () => {
  const photo = createPhotoRecord({
    dataUrl: imageData,
    fileName: "front.svg",
    mimeType: "image/svg+xml",
    size: 42,
    category: "face",
    note: "Day-0 face stream."
  });
  const fallback = createPhotoRecord({
    dataUrl: imageData,
    category: "unknown"
  });

  assert.equal(photo.category, "face");
  assert.equal(photo.note, "Day-0 face stream.");
  assert.equal(fallback.category, "body");
  assert.throws(() => createPhotoRecord({ dataUrl: "data:text/plain;base64,WA==" }), /image/);
});

test("sorts, filters, counts, and selects comparison photos", () => {
  const photos = [
    { id: "old-body", category: "body", createdAt: "2026-06-01T10:00:00.000Z" },
    { id: "face", category: "face", createdAt: "2026-06-02T10:00:00.000Z" },
    { id: "new-body", category: "body", createdAt: "2026-06-03T10:00:00.000Z" }
  ];

  assert.deepEqual(sortPhotosNewest(photos).map((photo) => photo.id), [
    "new-body",
    "face",
    "old-body"
  ]);
  assert.deepEqual(photosForCategory(photos, "body").map((photo) => photo.id), [
    "new-body",
    "old-body"
  ]);
  assert.deepEqual(
    photoCategoryCounts(photos).map((category) => [category.id, category.count]),
    [
      ["body", 2],
      ["face", 1],
      ["hair", 0]
    ]
  );
  assert.deepEqual(defaultPhotoComparison(photos, "body"), {
    beforeId: "old-body",
    afterId: "new-body",
    ghostId: "new-body"
  });
});

test("Capacitor photo asset adapter stores image bytes outside metadata", async () => {
  const filesystem = createFakeFilesystem();
  const adapter = createCapacitorPhotoAssetAdapter({ filesystem, directory: "DATA" });
  const photo = {
    id: "photo-1",
    accountId: "account-1",
    createdAt: "2026-06-12T00:00:00.000Z",
    dataUrl: imageData,
    fileName: "front.svg",
    mimeType: "image/svg+xml",
    category: "body"
  };

  const stored = await adapter.storePhoto(photo);
  const storedPaths = Object.keys(filesystem.dump());

  assert.equal(storedPaths.length, 1);
  assert.equal(filesystem.dump()[storedPaths[0]], "PHN2Zy8+");
  assert.equal(stored.persistedPhoto.dataUrl, undefined);
  assert.equal(stored.persistedPhoto.photoStorage.kind, PHOTO_ASSET_STORAGE_KIND);
  assert.equal(stored.runtimePhoto.dataUrl, imageData);

  const hydrated = await adapter.hydratePhoto(stored.persistedPhoto);
  assert.equal(hydrated.dataUrl, imageData);

  await adapter.removePhoto(stored.persistedPhoto);
  assert.deepEqual(filesystem.dump(), {});
});

test("account photo asset persistence keeps native image data out of local metadata", async () => {
  installLocalStorageMock();
  const filesystem = createFakeFilesystem();
  const photoAssetAdapter = createCapacitorPhotoAssetAdapter({ filesystem, directory: "DATA" });
  const record = createPhotoRecord({
    dataUrl: imageData,
    fileName: "side.svg",
    mimeType: "image/svg+xml",
    size: 42,
    category: "hair"
  });

  const runtimePhoto = await persistUserPhotoAsset("account-1", record, {
    photoAssetAdapter
  });
  const storedPhotos = loadUserPhotos("account-1");

  assert.equal(runtimePhoto.dataUrl, imageData);
  assert.equal(storedPhotos.length, 1);
  assert.equal(storedPhotos[0].dataUrl, undefined);
  assert.equal(storedPhotos[0].photoStorage.kind, PHOTO_ASSET_STORAGE_KIND);

  const hydratedPhotos = await hydrateUserPhotoAssets(storedPhotos, { photoAssetAdapter });
  assert.equal(hydratedPhotos[0].dataUrl, imageData);

  const remainingPhotos = await deleteUserPhotoAsset("account-1", runtimePhoto.id, {
    photoAssetAdapter
  });

  assert.deepEqual(remainingPhotos, []);
  assert.deepEqual(loadUserPhotos("account-1"), []);
  assert.deepEqual(filesystem.dump(), {});
});
