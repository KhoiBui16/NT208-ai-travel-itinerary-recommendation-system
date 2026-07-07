import type { SyntheticEvent } from "react";
import { API_BASE } from "../services/api";

export const DEFAULT_PLACE_IMAGE = "/img/placeholder.svg";

// Category-based fallback images - now pointing to default placeholder.svg
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  food: "/img/placeholder.svg",
  attraction: "/img/placeholder.svg",
  nature: "/img/placeholder.svg",
  entertainment: "/img/placeholder.svg",
  shopping: "/img/placeholder.svg",
};

// Destination name → representative cover image - now pointing to default placeholder.svg
const DESTINATION_COVER_IMAGES: Record<string, string> = {
  "Hà Nội": "/img/placeholder.svg",
  "TP. Hồ Chí Minh": "/img/placeholder.svg",
  "Hồ Chí Minh": "/img/placeholder.svg",
  "Đà Nẵng": "/img/placeholder.svg",
  "Hội An": "/img/placeholder.svg",
  "Hạ Long": "/img/placeholder.svg",
  "Sapa": "/img/placeholder.svg",
  "Nha Trang": "/img/placeholder.svg",
  "Đà Lạt": "/img/placeholder.svg",
  "Phú Quốc": "/img/placeholder.svg",
  "Huế": "/img/placeholder.svg",
  "Ninh Bình": "/img/placeholder.svg",
};

function resolveApiImageUrl(
  image?: string | null,
  fallbackSrc: string = DEFAULT_PLACE_IMAGE,
): string {
  const trimmedImage = image?.trim();
  if (!trimmedImage) return fallbackSrc;

  if (
    trimmedImage.startsWith("http://") ||
    trimmedImage.startsWith("https://") ||
    trimmedImage.startsWith("data:")
  ) {
    return trimmedImage;
  }

  if (trimmedImage.startsWith("/")) {
    return `${API_BASE}${trimmedImage}`;
  }

  return `${API_BASE}/${trimmedImage.replace(/^\.?\//, "")}`;
}

export function resolvePlaceImage(
  image?: string | null,
  fallbackSrc: string = DEFAULT_PLACE_IMAGE,
): string {
  const resolved = resolveApiImageUrl(image, fallbackSrc);
  return resolveApiImageUrl(resolved);
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
  const resolved = resolveApiImageUrl(image, getPlaceFallbackImage(category));
  return resolveApiImageUrl(resolved);
}

/**
 * Converts a Vietnamese city name to its corresponding URL slug.
 */
export function getCitySlug(cityName: string): string {
  let normalized = cityName.trim().toLowerCase();
  if (normalized.includes("ho chi minh") || normalized.includes("hcm")) {
    return "tp-ho-chi-minh";
  }
  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Returns a destination cover image for use in TripHistory cards.
 * Splits multi-destination names, sorts them A-Z alphabetically, and picks the first city's image.
 */
export function getDestinationFallbackImage(destination?: string | null): string {
  if (!destination) return resolvePlaceImage(DEFAULT_PLACE_IMAGE);
  
  const cities = destination
    .split(/,\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
    
  if (cities.length === 0) return resolvePlaceImage(DEFAULT_PLACE_IMAGE);
  
  // Sort alphabetically A-Z (Vietnamese locale aware)
  cities.sort((a, b) => a.localeCompare(b, "vi"));
  
  const chosenCity = cities[0];
  return resolvePlaceImage(`/img/destinations/${getCitySlug(chosenCity)}.jpg`);
}

export function applyPlaceImageFallback(
  event: SyntheticEvent<HTMLImageElement>,
  fallbackSrc: string = DEFAULT_PLACE_IMAGE,
): void {
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = resolvePlaceImage(fallbackSrc);
}
