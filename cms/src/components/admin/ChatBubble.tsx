"use client";

/**
 * Floating chat bubble cho Payload admin.
 *
 * Click bubble → mở panel 380×600. Gửi tin nhắn → SSE từ /api/chat:
 *   event: thinking → preview lên status line
 *   event: tool     → 🔧 mô tả tool đang chạy
 *   event: reply    → final reply (đẩy vào messages list)
 *   event: error    → fallback message
 *   event: done     → close stream
 *
 * History per Payload user (server-side trong bot Map<sessionKey, ...>).
 * `Reset` xoá history phía bot.
 */
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ToolEvent {
  name: string;
  label?: string;
}

const STORAGE_KEY = "xhr-chat-open";

export const ChatBubble: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [activity, setActivity] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Persist open/close giữa navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  // Auto-scroll xuống cuối khi có message mới
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activity]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setActivity(["💭 Đang nghĩ..."]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `⚠️ Lỗi: ${res.status} ${errBody.slice(0, 200)}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const events = buf.split("\n\n");
        buf = events.pop() ?? "";

        for (const ev of events) {
          const eventLine = ev
            .split("\n")
            .find((l) => l.startsWith("event:"))
            ?.slice(6)
            .trim();
          const dataLine = ev
            .split("\n")
            .find((l) => l.startsWith("data:"))
            ?.slice(5)
            .trim();
          if (!eventLine) continue;

          if (eventLine === "thinking" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as { text: string };
              const preview = obj.text.split("\n")[0].slice(0, 100);
              setActivity((a) => [...a.slice(-4), `💭 ${preview}`]);
            } catch { /* ignore */ }
          } else if (eventLine === "tool" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as ToolEvent;
              const lbl = obj.label ?? `🔧 ${obj.name}`;
              setActivity((a) => [...a.slice(-4), lbl]);
            } catch { /* ignore */ }
          } else if (eventLine === "reply" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as { text: string };
              setMessages((m) => [...m, { role: "assistant", text: obj.text }]);
            } catch { /* ignore */ }
          } else if (eventLine === "error" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as { message: string };
              setMessages((m) => [
                ...m,
                { role: "assistant", text: `⚠️ ${obj.message}` },
              ]);
            } catch { /* ignore */ }
          } else if (eventLine === "done") {
            setActivity([]);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${msg}` }]);
    } finally {
      setStreaming(false);
      setActivity([]);
    }
  }

  async function reset() {
    if (streaming) return;
    setMessages([]);
    setActivity([]);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        aria-label={open ? "Đóng chat" : "Mở chat"}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background:
            "linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)",
          color: "white",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(16,185,129,0.45)",
          zIndex: 9998,
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 92,
            width: 380,
            height: 560,
            background: "rgb(var(--theme-elevation-0))",
            color: "rgb(var(--theme-elevation-1000))",
            border: "1px solid rgb(var(--theme-elevation-150))",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9997,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background:
                "linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>SkillBot</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Trợ lý AI quản lý sản xuất</div>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={streaming}
              title="Xoá lịch sử trò chuyện"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.4)",
                color: "white",
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 6,
                cursor: streaming ? "not-allowed" : "pointer",
                opacity: streaming ? 0.5 : 1,
              }}
            >
              🧹 Reset
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  opacity: 0.55,
                  fontSize: 12,
                  marginTop: 20,
                  padding: "0 16px",
                  lineHeight: 1.6,
                }}
              >
                Chào! Hỏi tôi về đơn hàng, kho vải, định mức, NCC, ... bất cứ thứ gì
                trong hệ thống. Vd: <em>"đơn PE-001 đang ở bước nào"</em>,
                <em> "tồn kho vải VL-001"</em>, <em>"nhắc tôi gọi khách 14h thứ 5"</em>.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "9px 13px",
                  borderRadius: 12,
                  background:
                    m.role === "user"
                      ? "rgb(var(--theme-success-500))"
                      : "rgb(var(--theme-elevation-50))",
                  color: m.role === "user" ? "white" : "inherit",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  border:
                    m.role === "assistant"
                      ? "1px solid rgb(var(--theme-elevation-100))"
                      : "none",
                }}
              >
                {m.text}
              </div>
            ))}
            {activity.length > 0 && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  padding: "9px 13px",
                  borderRadius: 12,
                  background: "rgb(var(--theme-elevation-50))",
                  border: "1px dashed rgb(var(--theme-elevation-200))",
                  fontSize: 12,
                  opacity: 0.85,
                  whiteSpace: "pre-line",
                }}
              >
                {activity.join("\n")}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 10,
              borderTop: "1px solid rgb(var(--theme-elevation-100))",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={streaming}
              placeholder="Nhắn tin..."
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgb(var(--theme-elevation-150))",
                background: "rgb(var(--theme-elevation-0))",
                color: "inherit",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={streaming || !input.trim()}
              style={{
                padding: "0 14px",
                borderRadius: 8,
                border: "none",
                background:
                  "linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
                opacity: streaming || !input.trim() ? 0.5 : 1,
              }}
            >
              {streaming ? "..." : "Gửi"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBubble;
