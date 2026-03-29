import { useState } from "react";
import { MessageCircle, X, Send, AlertCircle } from "lucide-react";

interface FloatingAIChatProps {
  selectedCities: string[];
  onOpen?: () => void;
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export function FloatingAIChat({ selectedCities, onOpen }: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleOpen = () => {
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Xin chào! Tôi có thể giúp bạn tối ưu hóa lịch trình hoặc gợi ý địa điểm tại: ${selectedCities.join(", ")}`,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const quickReplies = [
    { id: 1, text: "Tối ưu lịch trình", icon: "✨" },
    { id: 2, text: "Gợi ý địa điểm", icon: "📍" },
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Tích hợp API gọi AI thực tế tại đây, xóa setTimeout giả lập
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        text: "Tôi đã nhận được yêu cầu của bạn. Vui lòng xác nhận các thay đổi trước khi áp dụng vào lịch trình.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleQuickReply = (text: string) => {
    handleSendMessage(text);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl transition-all hover:scale-110 hover:shadow-purple-500/50 animate-pulse"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[500px] w-96 flex-col rounded-2xl bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div>
          <h3 className="font-bold">AI Travel Assistant</h3>
          <p className="text-xs text-white/80">
            Gợi ý trong: {selectedCities.join(", ")}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Warning Banner */}
      <div className="flex items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>⚠️ Mọi thay đổi cần xác nhận của bạn</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === "user"
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <span className="mt-1 block text-xs opacity-70">
                {message.timestamp.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Replies */}
      {messages.length <= 2 && (
        <div className="border-t border-gray-200 p-3">
          <p className="mb-2 text-xs text-gray-500">Gợi ý nhanh (tùy chọn):</p>
          <div className="flex gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleQuickReply(reply.text)}
                className="flex-1 rounded-lg border-2 border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100"
              >
                {reply.icon} {reply.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-all hover:scale-105"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
