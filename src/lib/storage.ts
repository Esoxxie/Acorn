import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { MealPhoto } from "../../shared/models";
import type { PreparedImageAssets } from "./image";
import { storage } from "./firebase";

const urlCache = new Map<string, string>();

export async function uploadMealImages(
  uid: string,
  mealId: string,
  assets: PreparedImageAssets,
): Promise<MealPhoto> {
  const displayPath = `users/${uid}/meals/${mealId}/display.webp`;
  const thumbPath = `users/${uid}/meals/${mealId}/thumb.webp`;

  await Promise.all([
    uploadBytes(ref(storage, displayPath), assets.displayBlob, {
      contentType: assets.displayBlob.type,
      cacheControl: "public,max-age=31536000,immutable",
    }),
    uploadBytes(ref(storage, thumbPath), assets.thumbBlob, {
      contentType: assets.thumbBlob.type,
      cacheControl: "public,max-age=31536000,immutable",
    }),
  ]);

  return {
    storagePath: displayPath,
    thumbPath,
  };
}

export async function resolveStorageUrl(path: string): Promise<string> {
  if (path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  const cached = urlCache.get(path);
  if (cached) {
    return cached;
  }

  const url = await getDownloadURL(ref(storage, path));
  urlCache.set(path, url);
  return url;
}

export async function deleteMealImages(photo?: MealPhoto | null) {
  if (!photo) {
    return;
  }

  await Promise.allSettled([
    deleteObject(ref(storage, photo.storagePath)),
    deleteObject(ref(storage, photo.thumbPath)),
  ]);
}
