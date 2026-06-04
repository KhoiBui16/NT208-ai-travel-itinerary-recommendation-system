import type { SyntheticEvent } from "react";

export const DEFAULT_PLACE_IMAGE =
  "https://images.pexels.com/photos/2444403/pexels-photo-2444403.jpeg?auto=compress&cs=tinysrgb&w=1080";

// Category-based fallback images (Pexels — free to use)
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  food: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400",
  attraction: "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?w=400",
  nature: "https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?w=400",
  entertainment: "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?w=400",
  shopping: "https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?w=400",
};

// Destination name → representative cover image for TripHistory cards
const DESTINATION_COVER_IMAGES: Record<string, string> = {
  "Hà Nội": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=600&q=80",
  "TP. Hồ Chí Minh": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=600&q=80",
  "Hồ Chí Minh": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=600&q=80",
  "Đà Nẵng": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=600&q=80",
  "Hội An": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=600&q=80",
  "Vịnh Hạ Long": "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=600&q=80",
  "Hạ Long": "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=600&q=80",
  "Sapa": "https://images.unsplash.com/photo-1694152362876-42d5815a214d?w=600&q=80",
  "Nha Trang": "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?w=600",
  "Đà Lạt": "https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?w=600",
  "Phú Quốc": "https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?w=600",
  "Huế": "https://images.pexels.com/photos/2249485/pexels-photo-2249485.jpeg?w=600",
  "Ninh Bình": "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?w=600",
};

export function resolvePlaceImage(image?: string | null): string {
  const trimmedImage = image?.trim();
  return trimmedImage || DEFAULT_PLACE_IMAGE;
}

/**
 * Returns a category-specific fallback image.
 * Used when place.image is empty (all 618 places currently have empty image field).
 */
export function getPlaceFallbackImage(category?: string): string {
  const normalized = (category || "").toLowerCase().trim();
  if (normalized && CATEGORY_FALLBACK_IMAGES[normalized]) {
    return CATEGORY_FALLBACK_IMAGES[normalized];
  }
  return DEFAULT_PLACE_IMAGE;
}

/**
 * Resolves a place image: non-empty API image wins; falls back to category image.
 */
export function resolvePlaceImageWithCategory(
  image?: string | null,
  category?: string,
): string {
  const trimmedImage = image?.trim();
  if (trimmedImage) return trimmedImage;
  return getPlaceFallbackImage(category);
}

/**
 * Returns a destination cover image for use in TripHistory cards.
 */
export function getDestinationFallbackImage(destination?: string | null): string {
  if (!destination) return DEFAULT_PLACE_IMAGE;
  const key = destination.trim();
  return DESTINATION_COVER_IMAGES[key] ?? DEFAULT_PLACE_IMAGE;
}

export function applyPlaceImageFallback(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = DEFAULT_PLACE_IMAGE;
}
