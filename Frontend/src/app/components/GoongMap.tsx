/**
 * GoongMap — renders a real interactive Goong map for a destination's places.
 *
 * Replaces the old DailyItinerary "Bản đồ chưa tích hợp" placeholder. Centers on
 * the centroid of geocoded places and drops a colored marker per place (color by
 * category). Falls back to a Hanoi default center when no place has coordinates,
 * and to a config hint when VITE_GOONG_MAP_API_KEY is missing.
 *
 * Data: places come from `GET /api/v1/places/destinations/{name}` whose
 * PlaceResponse now includes `latitude`/`longitude` (exposed by the BE
 * places schema). The Goong JS SDK authenticates tiles via `accessToken`.
 */
import { useEffect, useRef } from "react";
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";
import type { PlaceResponse } from "../services/places";

interface GoongMapProps {
  /** Places to plot. Only those with latitude+longitude become markers. */
  places: PlaceResponse[];
  /** Destination label for the overlay caption. */
  destinationName?: string;
}

// Default center when no place is geocoded: Hà Nội.
const HANOI_CENTER: [number, number] = [105.8342, 21.0285];

// Goong tiles style (public; auth via accessToken appended to tile requests).
const GOONG_STYLE = "https://tiles.goong.io/assets/goong_map_web.json";

// Marker color by place category (matches the FE category palette).
const TYPE_COLOR: Record<string, string> = {
  food: "#f97316",
  attraction: "#8b5cf6",
  nature: "#22c55e",
  entertainment: "#ec4899",
  shopping: "#0ea5e9",
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        } as Record<string, string>
      )[c],
  );
}

function geocodedPlaces(places: PlaceResponse[]): PlaceResponse[] {
  return places.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );
}

function computeCenter(places: PlaceResponse[]): [number, number] {
  const geo = geocodedPlaces(places);
  if (geo.length === 0) return HANOI_CENTER;
  const sumLng = geo.reduce((s, p) => s + (p.longitude as number), 0);
  const sumLat = geo.reduce((s, p) => s + (p.latitude as number), 0);
  return [sumLng / geo.length, sumLat / geo.length];
}

export function GoongMap({ places, destinationName }: GoongMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<goongjs.Map | null>(null);
  const markersRef = useRef<goongjs.Marker[]>([]);
  // Keep the latest places accessible inside the map "load" handler.
  const placesRef = useRef<PlaceResponse[]>(places);
  placesRef.current = places;

  const apiKey = import.meta.env.VITE_GOONG_MAP_API_KEY as string | undefined;
  const geo = geocodedPlaces(places);

  // (Re)draw markers from the given places on the given map.
  const drawMarkers = (map: goongjs.Map, list: PlaceResponse[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    list.forEach((p) => {
      const color = TYPE_COLOR[p.type] ?? "#0891b2";
      const popup = new goongjs.Popup({ offset: 16 }).setHTML(
        `<strong>${escapeHtml(p.name)}</strong>`,
      );
      const marker = new goongjs.Marker({ color })
        .setLngLat([p.longitude as number, p.latitude as number])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (list.length > 1) {
      const lons = list.map((p) => p.longitude as number);
      const lats = list.map((p) => p.latitude as number);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 48, maxZoom: 14 },
      );
    } else if (list.length === 1) {
      map.setCenter([list[0].longitude as number, list[0].latitude as number]);
      map.setZoom(13);
    }
  };

  // Init the map once when the container + key are ready.
  useEffect(() => {
    if (!containerRef.current || !apiKey || mapRef.current) return;

    goongjs.accessToken = apiKey;
    const [lng, lat] = computeCenter(placesRef.current);
    const map = new goongjs.Map({
      container: containerRef.current,
      style: GOONG_STYLE,
      center: [lng, lat],
      zoom: geo.length > 0 ? 12 : 10,
    });
    mapRef.current = map;

    const onLoad = () => drawMarkers(map, placesRef.current);
    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // When places change after the map is already loaded, refresh markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    drawMarkers(map, places);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Chưa cấu hình Goong Maps API key
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Thêm <code className="rounded bg-gray-200 px-1">VITE_GOONG_MAP_API_KEY</code> vào{" "}
            <code className="rounded bg-gray-200 px-1">Frontend/.env</code> rồi tải lại trang.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow">
        {destinationName ? `Bản đồ ${destinationName}` : "Bản đồ"} · {geo.length} địa điểm
      </div>
    </div>
  );
}
