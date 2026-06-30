import React, { useState, useEffect, useRef } from "react";
import { User, Edit2, Save, Check, Share2, Copy, X } from "lucide-react";
import { shareItinerary } from "../services/itinerary";
import { toast } from "sonner";

interface TopActionBarProps {
  travelersTotal: number;
  tripName: string;
  tripId: number | null;
  isSaving: boolean;
  onEditTravelers: () => void;
  onSaveItinerary: () => void;
  onCreateItinerary: () => void;
  onNameChange: (newName: string) => void;
}

export function TopActionBar({ travelersTotal, tripName, tripId, isSaving, onEditTravelers, onSaveItinerary, onCreateItinerary, onNameChange }: TopActionBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(tripName);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cập nhật lại tempName khi tripName từ ngoài truyền vào thay đổi
  useEffect(() => {
    setTempName(tripName);
  }, [tripName]);

  // Tự động focus vào ô input khi bấm edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Lưu tên
  const handleSave = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    } else {
      setTempName(tripName); // Trả lại tên cũ nếu để trống
    }
    setIsEditing(false);
  };

  // Bắt sự kiện phím Enter/Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTempName(tripName);
      setIsEditing(false);
    }
  };

  // Copy share link to clipboard
  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Đã sao chép liên kết chia sẻ");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Đã sao chép liên kết chia sẻ");
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center">

          {/* Tính năng Đổi tên lịch trình */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-xl font-bold text-gray-900 border-b-2 border-cyan-500 focus:outline-none bg-transparent py-0.5 min-w-[300px]"
                placeholder="Nhập tên lịch trình..."
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                title="Lưu"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 cursor-pointer group rounded-lg hover:bg-gray-50 py-1 pr-2 transition-colors"
              onClick={() => setIsEditing(true)}
              title="Nhấn để đổi tên lịch trình"
            >
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-cyan-700 transition-colors">
                {tripName || "Lịch trình chuyến đi"}
              </h1>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 group-hover:bg-cyan-100 transition-colors">
                <Edit2 className="h-4 w-4 text-gray-500 group-hover:text-cyan-600" />
              </div>
            </div>
          )}

          {/* Nút số người - Đã được thêm ml-8 để giãn khoảng cách to ra */}
          <button
            onClick={onEditTravelers}
            className="ml-8 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
          >
            <User className="h-4 w-4 text-cyan-600" />
            <span className="text-sm font-semibold text-gray-900">{travelersTotal} người</span>
            <Edit2 className="h-3.5 w-3.5 text-gray-400" />
          </button>

        </div>

        <div className="flex items-center gap-3">
          {/* Share button */}
          {tripId && (
            <button
              onClick={async () => {
                setIsSharing(true);
                try {
                  const resp = await shareItinerary(tripId);
                  // Guard against placeholder/invalid tokens returned by the BE
                  const token = resp.shareToken;
                  const isValidToken =
                    token &&
                    !token.startsWith("[REDACTED") &&
                    token !== "undefined" &&
                    token !== "null" &&
                    token.length > 8;
                  if (!isValidToken) {
                    toast.error(
                      "Không thể hiển thị lại liên kết chia sẻ cũ. Vui lòng tạo liên kết chia sẻ mới sau khi đăng nhập.",
                    );
                    return;
                  }
                  // Prefer full URL from BE; fall back to building from token
                  const link =
                    resp.shareUrl && resp.shareUrl.startsWith("http")
                      ? resp.shareUrl
                      : `${window.location.origin}/shared/${token}`;
                  setShareLink(link);
                } catch {
                  toast.error("Không thể chia sẻ lịch trình");
                } finally {
                  setIsSharing(false);
                }
              }}
              disabled={isSharing}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md hover:border-cyan-200 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              {isSharing ? "Đang chia sẻ..." : "Chia sẻ"}
            </button>
          )}
          <button
            onClick={onSaveItinerary}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Đang lưu..." : "Lưu lịch trình"}
          </button>
          <button
            onClick={onCreateItinerary}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02]"
          >
            <Check className="h-4 w-4" />
            Tạo lịch trình
          </button>
        </div>
      </div>

      {/* Share Link Modal */}
      {shareLink && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5">
          <Share2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">{shareLink}</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 flex-shrink-0"
          >
            <Copy className="h-3.5 w-3.5" />
            Sao chép
          </button>
          <button
            onClick={() => setShareLink(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
