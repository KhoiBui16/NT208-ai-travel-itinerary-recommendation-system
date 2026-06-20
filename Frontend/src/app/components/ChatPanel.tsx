/**
 * ChatPanel — trip-bound companion chat UI cho Phase C3B.
 *
 * Component này làm 2 việc rõ ràng:
 * 1. Quản lý chat session thật của trip hiện tại
 * 2. Hiển thị message history / send message thật qua backend
 *
 * Runtime rules:
 * - Không lưu message vào localStorage
 * - Không dùng mock data cho history hoặc reply
 * - `proposedOperations` chỉ để hiển thị gợi ý, chưa apply vào itinerary
 */

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCcw,
  SendHorizontal,
  ShieldAlert,
} from "lucide-react";
import {
  createChatSession,
  listChatMessages,
  listChatSessions,
  sendChatMessage,
} from "../services/chat";
import type { ChatMessage, ChatSession } from "../types/chat.types";
import { getChatErrorMessage } from "../utils/chatErrorHandler";

interface ChatPanelProps {
  tripId: number;
  isAuthenticated: boolean;
}

type PanelState = "loading" | "error" | "empty" | "active";

function summarizeOperation(operation: Record<string, unknown>): string {
  const description = operation.description;
  if (typeof description === "string" && description.trim().length > 0) {
    return description.trim();
  }

  const type = operation.type;
  if (typeof type === "string" && type.trim().length > 0) {
    return `Đề xuất: ${type.trim()}`;
  }

  return "Đề xuất thay đổi lịch trình";
}

export function ChatPanel({ tripId, isAuthenticated }: ChatPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("loading");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadSessions();
  }, [tripId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isMessagesLoading]);

  async function loadSessions() {
    setPanelState("loading");
    setError(null);

    try {
      const response = await listChatSessions(tripId, 0, 1);

      if (response.total === 0) {
        setMessages([]);
        setSessionCount(0);
        setCurrentSession(null);
        setPanelState("empty");
        return;
      }

      const latestSession = response.items[0];
      setCurrentSession(latestSession);
      setSessionCount(response.total);
      setPanelState("active");
      await loadMessages(latestSession.id);
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
      setCurrentSession(null);
      setMessages([]);
      setPanelState("error");
      setError(getChatErrorMessage(err));
    }
  }

  async function loadMessages(sessionId: number) {
    setIsMessagesLoading(true);
    setError(null);

    try {
      const response = await listChatMessages(sessionId, 0, 50);
      setMessages(response.items);
    } catch (err) {
      console.error("Failed to load chat messages:", err);
      setError(getChatErrorMessage(err));
    } finally {
      setIsMessagesLoading(false);
    }
  }

  async function handleCreateSession() {
    setPanelState("loading");
    setError(null);

    try {
      const newSession = await createChatSession(tripId);
      setCurrentSession(newSession);
      setMessages([]);
      setSessionCount((prev) => prev + 1);
      setDraftMessage("");
      setPanelState("active");
    } catch (err) {
      console.error("Failed to create chat session:", err);
      setPanelState("error");
      setError(getChatErrorMessage(err));
    }
  }

  async function handleRefresh() {
    if (!currentSession) {
      await loadSessions();
      return;
    }
    await loadMessages(currentSession.id);
  }

  async function handleSendMessage() {
    const content = draftMessage.trim();
    if (!currentSession || !content || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(currentSession.id, { content });
      setMessages((prev) => [...prev, response.userMessage, response.assistantMessage]);
      setDraftMessage("");
    } catch (err) {
      console.error("Failed to send chat message:", err);
      setError(getChatErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  if (panelState === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="mt-3 text-sm text-gray-600">Đang tải AI Chat...</p>
      </div>
    );
  }

  if (panelState === "error") {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Không thể tải AI Chat</p>
            <p className="mt-1 text-xs text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={() => void loadSessions()}
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
          <MessageCircle className="h-5 w-5 text-cyan-600" />
          <h3 className="font-semibold text-gray-900">Companion Chat</h3>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="max-w-56 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-600">
              Chưa có phiên chat cho chuyến đi này
            </p>
            <p className="mt-1 text-xs text-gray-500">
              AI chat thật sẽ đọc lịch trình hiện tại và chỉ đề xuất thay đổi để bạn xác nhận sau.
            </p>
          </div>

          <button
            onClick={() => void handleCreateSession()}
            disabled={!isAuthenticated}
            className="mt-6 flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Bắt đầu cuộc trò chuyện
          </button>

          {!isAuthenticated && (
            <p className="mt-3 text-xs text-gray-500">
              Đăng nhập để dùng companion chat gắn với lịch trình này
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-cyan-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Companion Chat</h3>
            <p className="text-xs text-gray-500">Phiên thật gắn với lịch trình #{tripId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleRefresh()}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Làm mới hội thoại"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => void handleCreateSession()}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Tạo phiên mới"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
            {currentSession?.status}
          </span>
          <span>•</span>
          <span>{sessionCount} phiên</span>
          <span>•</span>
          <span>Session #{currentSession?.id}</span>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {isMessagesLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-600" />
              <p className="mt-2 text-xs text-gray-500">Đang tải lịch sử chat...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-60 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-600">
                AI companion chưa có tin nhắn nào trong phiên này
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Bạn có thể hỏi về lịch hiện tại hoặc yêu cầu đề xuất thay đổi. Hệ thống chỉ gợi ý,
                chưa tự lưu.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            const operationSummaries = message.proposedOperations.map(summarizeOperation);

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-cyan-600 text-white"
                      : "border border-gray-200 bg-white text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
                    <span>{isUser ? "Bạn" : "AI Companion"}</span>
                    <span>•</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>

                  {!isUser && message.requiresConfirmation && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <p className="font-semibold">Cần xác nhận trước khi áp dụng</p>
                      {operationSummaries.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {operationSummaries.map((summary, index) => (
                            <li key={`${message.id}-${index}`} className="leading-5">
                              • {summary}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <p className="mb-2 text-[11px] leading-5 text-gray-500">
          AI companion chỉ đọc itinerary hiện tại và trả đề xuất thay đổi. Chưa có thao tác nào
          được lưu tự động vào DB ở bước này.
        </p>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2">
          <textarea
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Hỏi về lịch trình hiện tại hoặc đề xuất thay đổi..."
            rows={2}
            disabled={isSending}
            className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          />

          <div className="flex items-center justify-between border-t border-gray-200 px-2 pt-2">
            <span className="text-[11px] text-gray-400">
              Enter để gửi, Shift + Enter để xuống dòng
            </span>
            <button
              onClick={() => void handleSendMessage()}
              disabled={isSending || draftMessage.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  Gửi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
