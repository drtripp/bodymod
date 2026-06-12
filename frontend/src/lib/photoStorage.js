import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { isNativeCapacitorRuntime } from "./storageAdapter.js";

export const PHOTO_ASSET_STORAGE_KIND = "capacitor-filesystem";
export const INLINE_PHOTO_STORAGE_KIND = "inline-data-url";
export const PHOTO_ASSET_ROOT = "bodymod-progress-photos";

const imageDataUrlPattern = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;

export function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(imageDataUrlPattern);
  if (!match) {
    throw new Error("Choose an image file.");
  }

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "jpg";
  }
  if (normalized === "image/svg+xml") {
    return "svg";
  }
  if (normalized === "image/webp") {
    return "webp";
  }
  if (normalized === "image/gif") {
    return "gif";
  }
  return "png";
}

function safePhotoId(photoId) {
  const normalized = String(photoId || crypto.randomUUID())
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .slice(0, 80);
  return normalized || crypto.randomUUID();
}

function stripImageData(photo) {
  const { dataUrl, ...metadata } = photo;
  return metadata;
}

async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function normalizeFilesystemData(data) {
  if (typeof data === "string") {
    return data;
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return blobToBase64(data);
  }
  return "";
}

export function createWebPhotoAssetAdapter() {
  return {
    name: "web-inline-photo-data",
    async storePhoto(photo) {
      return {
        persistedPhoto: {
          ...photo,
          photoStorage: {
            kind: INLINE_PHOTO_STORAGE_KIND,
            version: 1
          }
        },
        runtimePhoto: {
          ...photo,
          photoStorage: {
            kind: INLINE_PHOTO_STORAGE_KIND,
            version: 1
          }
        }
      };
    },
    async hydratePhoto(photo) {
      return photo;
    },
    async hydratePhotos(photos = []) {
      return photos;
    },
    async removePhoto() {
      return { removed: false };
    }
  };
}

export function createCapacitorPhotoAssetAdapter({
  filesystem = Filesystem,
  directory = Directory.Data,
  rootDirectory = PHOTO_ASSET_ROOT
} = {}) {
  async function storePhoto(photo) {
    const parsed = parseImageDataUrl(photo.dataUrl);
    const photoId = safePhotoId(photo.id);
    const storagePath = `${rootDirectory}/${photoId}.${extensionForMimeType(parsed.mimeType)}`;

    await filesystem.writeFile({
      path: storagePath,
      data: parsed.base64Data,
      directory,
      recursive: true
    });

    const metadata = stripImageData(photo);
    const photoStorage = {
      kind: PHOTO_ASSET_STORAGE_KIND,
      version: 1,
      path: storagePath,
      directory,
      mimeType: parsed.mimeType
    };
    const persistedPhoto = {
      ...metadata,
      mimeType: metadata.mimeType || parsed.mimeType,
      photoStorage
    };

    return {
      persistedPhoto,
      runtimePhoto: {
        ...persistedPhoto,
        dataUrl: photo.dataUrl
      }
    };
  }

  async function hydratePhoto(photo) {
    if (photo?.dataUrl || photo?.photoStorage?.kind !== PHOTO_ASSET_STORAGE_KIND) {
      return photo;
    }

    const path = photo.photoStorage.path;
    if (!path) {
      return photo;
    }

    try {
      const { data } = await filesystem.readFile({
        path,
        directory: photo.photoStorage.directory || directory
      });
      const base64Data = await normalizeFilesystemData(data);
      if (!base64Data) {
        return photo;
      }

      const mimeType = photo.photoStorage.mimeType || photo.mimeType || "image/png";
      return {
        ...photo,
        dataUrl: `data:${mimeType};base64,${base64Data}`
      };
    } catch (error) {
      return photo;
    }
  }

  return {
    name: "capacitor-filesystem-photo-assets",
    storePhoto,
    hydratePhoto,
    async hydratePhotos(photos = []) {
      return Promise.all(photos.map((photo) => hydratePhoto(photo)));
    },
    async removePhoto(photo) {
      if (photo?.photoStorage?.kind !== PHOTO_ASSET_STORAGE_KIND || !photo.photoStorage.path) {
        return { removed: false };
      }

      await filesystem.deleteFile({
        path: photo.photoStorage.path,
        directory: photo.photoStorage.directory || directory
      });

      return { removed: true };
    }
  };
}

export function createDefaultPhotoAssetAdapter({ capacitor = Capacitor } = {}) {
  return isNativeCapacitorRuntime(capacitor)
    ? createCapacitorPhotoAssetAdapter()
    : createWebPhotoAssetAdapter();
}

export const defaultPhotoAssetAdapter = createDefaultPhotoAssetAdapter();
