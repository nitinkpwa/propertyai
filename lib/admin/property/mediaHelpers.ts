/** Max photos per property in admin media manager (AI import uses 20). */
export const MAX_PROPERTY_PHOTOS = 30;

/**
 * Keep cover in sync with gallery order:
 * - Cover is always photos[0]
 * - featured_image mirrors photos[0]
 * - If featured_image points at a gallery URL, that URL is moved to index 0
 * - Legacy rows with no featured_image fall back to the first photo
 */
export function normalizePhotosWithCover(
  photos: string[] | null | undefined,
  featuredImage?: string | null,
): { photos: string[]; featured_image: string } {
  const unique: string[] = [];
  for (const url of photos ?? []) {
    const trimmed = typeof url === "string" ? url.trim() : "";
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed);
  }

  if (unique.length === 0) {
    return { photos: [], featured_image: "" };
  }

  const preferred = featuredImage?.trim() || "";
  const cover = preferred && unique.includes(preferred) ? preferred : unique[0];
  const rest = unique.filter((u) => u !== cover);
  return { photos: [cover, ...rest], featured_image: cover };
}

export function setCoverAtIndex(
  photos: string[],
  featuredImage: string,
  index: number,
): { photos: string[]; featured_image: string } {
  if (index < 0 || index >= photos.length) {
    return normalizePhotosWithCover(photos, featuredImage);
  }
  return normalizePhotosWithCover(photos, photos[index]);
}

export function reorderPhotos(
  photos: string[],
  fromIndex: number,
  toIndex: number,
): { photos: string[]; featured_image: string } {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= photos.length ||
    toIndex >= photos.length
  ) {
    return normalizePhotosWithCover(photos, photos[0]);
  }
  const next = [...photos];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  // After reorder, first image becomes the cover.
  return normalizePhotosWithCover(next, next[0]);
}

export function removePhotoAtIndex(
  photos: string[],
  featuredImage: string,
  index: number,
): { photos: string[]; featured_image: string } {
  const next = photos.filter((_, i) => i !== index);
  const removed = photos[index];
  const nextFeatured =
    featuredImage && featuredImage !== removed ? featuredImage : next[0] || "";
  return normalizePhotosWithCover(next, nextFeatured);
}

export function replacePhotoAtIndex(
  photos: string[],
  featuredImage: string,
  index: number,
  newUrl: string,
): { photos: string[]; featured_image: string } {
  if (index < 0 || index >= photos.length || !newUrl.trim()) {
    return normalizePhotosWithCover(photos, featuredImage);
  }
  const next = [...photos];
  const old = next[index];
  next[index] = newUrl.trim();
  const nextFeatured = featuredImage === old || index === 0 ? newUrl.trim() : featuredImage;
  return normalizePhotosWithCover(next, nextFeatured);
}

export function appendPhotos(
  photos: string[],
  featuredImage: string,
  urls: string[],
  maxPhotos = MAX_PROPERTY_PHOTOS,
): { photos: string[]; featured_image: string } {
  const room = Math.max(0, maxPhotos - photos.length);
  const added = urls.map((u) => u.trim()).filter(Boolean).slice(0, room);
  return normalizePhotosWithCover([...photos, ...added], featuredImage || added[0] || "");
}

/** Order gallery for public surfaces: featured first, then remaining photos. */
export function orderPhotosForDisplay(
  photos: string[] | null | undefined,
  featuredImage?: string | null,
): string[] {
  return normalizePhotosWithCover(photos, featuredImage).photos;
}
