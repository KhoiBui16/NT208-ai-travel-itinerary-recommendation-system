/**
 * ChatPanel — Trip-bound companion chat panel component.
 *
 * Phase C3A-3: Session management foundation for companion chat.
 * This component handles:
 *   - Listing existing chat sessions for a trip
 *   - Creating new chat sessions
 *   - Displaying session status
 *   - Preparing UI for message display (C3B)
 *
 * Features:
 *   - Shows loading state while fetching sessions
 *   - Shows error state if API calls fail
 *   - Shows empty state if no session exists
 *   - Shows active session if one exists
 *   - Allows creating new session
 *
 * Props:
 *   - tripId: The trip ID to link chat sessions to
 *   - isAuthenticated: Whether user is authenticated (affects UI behavior)
 */

import { useState, useEffect } from "react";
import { MessageCircle, Plus, AlertCircle, Loader2 } from "lucide-react";
import {
  createChatSession,
  listChatSessions,
  getChatSession,
} from "../services/chat";
import type { ChatSession } from "../types/chat.types";

interface ChatPanelProps {
  tripId: number;
  isAuthenticated: boolean;
}

type PanelState = "loading" | "error" | "empty" | "active";

export function ChatPanel({ tripId, isAuthenticated }: ChatPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("loading");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load existing sessions on mount
  useEffect(() => {
    loadSessions();
  }, [tripId]);

  const loadSessions = async () => {
    setPanelState("loading");
    setError(null);

    try {
      const response = await listChatSessions(tripId, 0, 1);

      if (response.total === 0) {
        setSessionCount(0);
        setPanelState("empty");
        setCurrentSession(null);
      } else {
        setSessionCount(response.total);
        // Use the most recent session (first in list)
        const latestSession = response.items[0];
        setCurrentSession(latestSession);
        setPanelState("active");
      }
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
      setPanelState("error");
      setError(err instanceof Error ? err.message : "Không thể tải phiên chat");
    }
  };

  const handleCreateSession = async () => {
    setPanelState("loading");
    setError(null);

    try {
      const newSession = await createChatSession(tripId);
      setCurrentSession(newSession);
      setSessionCount((prev) => prev + 1);
      setPanelState("active");
    } catch (err) {
      console.error("Failed to create chat session:", err);
      setPanelState("error");
      setError(err instanceof Error ? err.message : "Không thể tạo phiên chat mới");
    }
  };

  const handleRefresh = () => {
    loadSessions();
  };

  // Render different states
  if (panelState === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="mt-3 text-sm text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (panelState === "error") {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Lỗi</p>
            <p className="mt-1 text-xs text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (panelState === "empty") {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-4">
          <MessageCircle className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900">Companion Chat</h3>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-600">
              Chưa có phiên chat cho chuyến đi này
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Bắt đầu trò chuyện với AI để nhận gợi ý chỉnh sửa lịch trình
            </p>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={!isAuthenticated}
            className="mt-6 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Bắt đầu cuộc trò chuyện
          </button>

          {!isAuthenticated && (
            <p className="mt-3 text-xs text-gray-500">
              Đăng nhập để sử dụng tính năng này
            </p>
          )}
        </div>
      </div>
    );
  }

  // Active session state
  return (
    <div className="flex h-full flex-col">
      {/* Session Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Companion Chat</h3>
            <p className="text-xs text-gray-500">
              Phiên: #{currentSession?.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Làm mới"
          >
            <Loader2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleCreateSession}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Phiên mới"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Session Info */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
            {currentSession?.status}
          </span>
          <span>•</span>
          <span>
            {sessionCount} phiên
          </span>
        </div>
      </div>

      {/* Messages Placeholder (C3B will implement actual messages) */}
      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-600">
              Giao diện tin nhắn sẽ có trong C3B
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Thread ID: {currentSession?.threadId}
            </p>
          </div>
        </div>
      </div>

      {/* Input Placeholder (C3B will implement actual chat) */}
      <div className="border-t border-gray-200 p-4">
        <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-400 text-center">
          Ô nhập tin nhắn sẽ có trong C3B
        </div>
      </div>
    </div>
  );
}
