import React from "react";
import { X } from "lucide-react";

interface AIPromoBubbleProps {
  show: boolean;
  onClose: () => void;
}

export function AIPromoBubble({ show, onClose }: AIPromoBubbleProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-pulse">
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 shadow-2xl max-w-xs">
        <button
          onClick={onClose}
          className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-600 shadow hover:bg-gray-100"
        >
          <X className="h-3 w-3" />
        </button>
        <p className="text-sm font-semibold text-white">
          Bạn cần gợi ý lịch trình? Thử hỏi AI ngay!
        </p>
        <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 bg-pink-500"></div>
      </div>
    </div>
  );
}