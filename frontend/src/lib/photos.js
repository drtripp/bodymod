export const photoCategoryOptions = [
  { id: "body", label: "Body" },
  { id: "face", label: "Face" },
  { id: "hair", label: "Hair" }
];

const categoryIds = new Set(photoCategoryOptions.map((category) => category.id));

export function normalizePhotoCategory(category) {
  return categoryIds.has(category) ? category : "body";
}

export function createPhotoRecord({
  dataUrl,
  fileName = "progress photo",
  mimeType = "image/*",
  size = 0,
  category = "body",
  note = ""
}) {
  const normalizedUrl = String(dataUrl || "");
  if (!normalizedUrl.startsWith("data:image/")) {
    throw new Error("Choose an image file.");
  }

  return {
    dataUrl: normalizedUrl,
    fileName: String(fileName || "progress photo"),
    mimeType: String(mimeType || "image/*"),
    size: Number(size) || 0,
    category: normalizePhotoCategory(category),
    note: String(note || "").trim()
  };
}

export function sortPhotosNewest(photos = []) {
  return photos
    .slice()
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

export function photosForCategory(photos = [], category = "all") {
  const sorted = sortPhotosNewest(photos);
  if (category === "all") {
    return sorted;
  }

  return sorted.filter((photo) => photo.category === category);
}

export function photoCategoryCounts(photos = []) {
  return photoCategoryOptions.map((category) => ({
    ...category,
    count: photos.filter((photo) => photo.category === category.id).length
  }));
}

export function defaultPhotoComparison(photos = [], category = "all") {
  const filtered = photosForCategory(photos, category);

  return {
    beforeId: filtered[1]?.id || filtered[0]?.id || "",
    afterId: filtered[0]?.id || "",
    ghostId: filtered[0]?.id || ""
  };
}
