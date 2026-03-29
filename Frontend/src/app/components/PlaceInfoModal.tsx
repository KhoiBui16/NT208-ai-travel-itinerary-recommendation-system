import { X, MapPin, Star, DollarSign, Clock, Users, Phone, Globe } from "lucide-react";

interface PlaceInfoModalProps {
  place: {
    name: string;
    image: string;
    description?: string;
    address?: string;
    rating?: number;
    reviewCount?: number;
    estimatedCost?: string;
    openingHours?: string;
    phone?: string;
    website?: string;
  };
  onClose: () => void;
}

export function PlaceInfoModal({ place, onClose }: PlaceInfoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute right-4 top-4 z-10">
          <button
            onClick={onClose}
            className="text-white opacity-80 transition-all hover:scale-110 hover:opacity-100"
          >
            <X className="h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          </button>
        </div>

        {/* Image */}
        <img
          src={place.image}
          alt={place.name}
          className="h-56 w-full rounded-t-2xl object-cover"
        />

        {/* Content */}
        <div className="p-6">
          <h3 className="mb-3 text-2xl font-bold text-gray-900">{place.name}</h3>

          {/* Rating & Reviews */}
          {place.rating && (
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold text-gray-900">{place.rating}</span>
                <span className="text-sm text-gray-500">/ 5.0</span>
              </div>
              {place.reviewCount && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{place.reviewCount.toLocaleString()} đánh giá</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {place.description && (
            <p className="mb-4 text-sm text-gray-700 leading-relaxed">{place.description}</p>
          )}

          {/* Details Section */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            {/* Address */}
            {place.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Địa chỉ</p>
                  <p className="text-sm text-gray-800">{place.address}</p>
                </div>
              </div>
            )}

            {/* Cost */}
            {place.estimatedCost && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Chi phí ước tính</p>
                  <p className="text-sm font-semibold text-green-700">{place.estimatedCost}</p>
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {place.openingHours && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Giờ mở cửa</p>
                  <p className="text-sm text-gray-800">{place.openingHours}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {place.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Điện thoại</p>
                  <a href={`tel:${place.phone}`} className="text-sm text-blue-600 hover:underline">
                    {place.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Website */}
            {place.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Website</p>
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline"
                  >
                    {place.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
