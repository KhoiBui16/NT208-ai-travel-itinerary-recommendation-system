import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Locate, Loader2, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
export interface MapActivity {
  id: string | number;
  name: string;
  time?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
}

interface ItineraryMapProps {
  activities: MapActivity[];
  destinationName?: string;
  /** CSS height value – defaults to "384px" (h-96) */
  height?: string;
}

// ─── Numbered marker icon factory ────────────────────────────────
function createNumberedIcon(index: number): L.DivIcon {
  const colors: Record<string, string> = {
    0: "from-cyan-500 to-cyan-600",
    1: "from-violet-500 to-purple-600",
    2: "from-orange-400 to-orange-600",
    3: "from-emerald-500 to-green-600",
    4: "from-pink-500 to-rose-600",
    5: "from-amber-400 to-amber-600",
    6: "from-indigo-500 to-indigo-600",
    7: "from-teal-500 to-teal-600",
  };
  const gradient = colors[index % Object.keys(colors).length];

  return L.divIcon({
    className: "itinerary-marker",
    html: `
      <div class="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br ${gradient} text-white text-sm font-bold shadow-lg border-[3px] border-white ring-2 ring-black/10 transition-transform hover:scale-110">
        ${index + 1}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

// ─── Auto-fit bounds helper ──────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);

  return null;
}

// ─── User current location marker icon ────────────────────────────
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div class="relative flex items-center justify-center h-6 w-6">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ─── Locate me button control ─────────────────────────────────────
function LocateMeButton({
  onLocationFound,
}: {
  onLocationFound: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        map.flyTo([latitude, longitude], 15, { animate: true, duration: 1.5 });
      },
      (error) => {
        setLoading(false);
        console.error("Error getting user location:", error);
        alert(
          "Không thể truy cập vị trí của bạn. Vui lòng cấp quyền truy cập vị trí."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleLocate}
      className={`absolute bottom-20 right-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 text-gray-700 hover:text-cyan-600 hover:bg-gray-50 active:scale-95 transition-all ${
        loading ? "animate-pulse opacity-70" : ""
      }`}
      title="Định vị vị trí của tôi"
    >
      <Locate className={`h-5 w-5 ${loading ? "text-cyan-600" : ""}`} />
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────
export function ItineraryMap({
  activities,
  destinationName,
  height = "384px",
}: ItineraryMapProps) {
  // Filter to only activities with valid coordinates
  const validActivities = activities.filter(
    (a): a is MapActivity & { latitude: number; longitude: number } =>
      a.latitude != null &&
      a.longitude != null &&
      !isNaN(a.latitude) &&
      !isNaN(a.longitude)
  );

  // Empty state
  if (validActivities.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200"
        style={{ height }}
      >
        <div className="text-center px-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200/80">
            <MapPin className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-500">
            Chưa có dữ liệu tọa độ
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Các địa điểm trong lịch trình này chưa có thông tin vị trí trên bản đồ
          </p>
        </div>
      </div>
    );
  }

  const positions: [number, number][] = validActivities.map((a) => [
    a.latitude,
    a.longitude,
  ]);

  // Center on first marker (fitBounds will override)
  const center: [number, number] = positions[0];
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-inner bg-gray-50"
      style={{ height }}
    >
      {/* Loading Spinner */}
      {mapLoading && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm transition-all duration-300">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-2" />
          <p className="text-sm font-semibold text-gray-600">Đang tải bản đồ...</p>
        </div>
      )}

      {/* Connection / OSM Server Overload Warning Banner */}
      {tileError && (
        <div className="absolute top-12 left-3 z-[1000] rounded-lg bg-amber-50 border border-amber-200 p-3 shadow-lg flex items-start gap-2 max-w-[320px] transition-all">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Sự cố tải bản đồ nền</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed font-sans">
              Không thể tải một số vùng bản đồ từ dịch vụ OpenStreetMap. Vui lòng kiểm tra kết nối mạng của bạn hoặc thử lại sau ít phút.
            </p>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => {
              setTileError(true);
            },
            load: () => {
              setMapLoading(false);
            }
          }}
        />

        <FitBounds positions={positions} />

        {/* Locate user button control */}
        <LocateMeButton onLocationFound={(lat, lng) => setUserLocation([lat, lng])} />

        {/* User current location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="text-xs font-semibold text-gray-800 font-sans p-1">
                📍 Vị trí hiện tại của bạn
              </div>
            </Popup>
          </Marker>
        )}

        {/* Polyline connecting markers in order */}
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#06b6d4",
              weight: 3,
              opacity: 0.7,
              dashArray: "8, 8",
            }}
          />
        )}

        {/* Numbered markers */}
        {validActivities.map((activity, index) => (
          <Marker
            key={activity.id}
            position={[activity.latitude, activity.longitude]}
            icon={createNumberedIcon(index)}
          >
            <Popup>
              <div className="min-w-[190px] flex flex-col gap-2 p-0.5 font-sans">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-[10px] font-bold text-white shadow-sm mt-0.5">
                    {index + 1}
                  </span>
                  <span className="font-bold text-gray-900 text-sm leading-snug">
                    {activity.name}
                  </span>
                </div>
                
                <div className="pl-7 text-xs space-y-1">
                  {activity.time && (
                    <p className="text-gray-500 font-medium m-0 flex items-center gap-1">
                      <span>🕐</span> {activity.time}
                    </p>
                  )}
                  {activity.description && (
                    <p className="text-gray-600 line-clamp-2 leading-relaxed m-0">
                      {activity.description}
                    </p>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activity.latitude},${activity.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 active:bg-cyan-800 transition-all hover:scale-[1.01] shadow-sm"
                  style={{ color: "#ffffff", textDecoration: "none" }}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Chỉ đường
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Destination overlay badge */}
      {destinationName && (
        <div className="absolute top-3 left-3 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
          <p className="text-xs font-semibold text-gray-700">
            📍 {destinationName}
          </p>
        </div>
      )}

      {/* Activity count badge */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <p className="text-xs font-medium text-gray-600">
          {validActivities.length} điểm trên bản đồ
        </p>
      </div>
    </div>
  );
}
