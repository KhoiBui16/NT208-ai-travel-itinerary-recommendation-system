import type { SyntheticEvent } from "react";

export const DEFAULT_PLACE_IMAGE =
  "https://images.pexels.com/photos/2444403/pexels-photo-2444403.jpeg?auto=compress&cs=tinysrgb&w=1080";

export function resolvePlaceImage(image?: string | null): string {
  const trimmedImage = image?.trim();
  return trimmedImage || DEFAULT_PLACE_IMAGE;
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
