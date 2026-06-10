import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPhotoRecord,
  defaultPhotoComparison,
  photoCategoryCounts,
  photosForCategory,
  sortPhotosNewest
} from "../src/lib/photos.js";

const imageData = "data:image/svg+xml;base64,PHN2Zy8+";

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
