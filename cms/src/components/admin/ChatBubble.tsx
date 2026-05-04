"use client";

/**
 * Floating chat bubble cho Payload admin.
 *
 * Design:
 *  - Bubble 56px góc phải dưới, gradient emerald + shadow + animated pulse
 *    khi có message chưa đọc.
 *  - Panel 400×620, header gradient + brand dot, messages list với avatar
 *    + bubbles bo góc, activity dots animation khi đang stream.
 *  - History per Payload user (server-side trong bot Map<sessionKey, ...>).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

interface ToolEvent {
  name: string;
  label?: string;
}

const STORAGE_KEY = "skillbot-chat-open";

/**
 * Render markdown đơn giản trong message:
 *  - **bold**, *italic*
 *  - `code`
 *  - line breaks
 *  - bullet lines bắt đầu bằng "- "
 */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const isBullet = /^[-•]\s+/.test(trimmed);
    const inner = isBullet ? trimmed.replace(/^[-•]\s+/, "") : line;
    const parts = inner.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g).map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={j}>{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
        return <em key={j}>{p.slice(1, -1)}</em>;
      }
      if (p.startsWith("`") && p.endsWith("`")) {
        return (
          <code
            key={j}
            style={{
              background: "rgba(0,0,0,0.06)",
              padding: "1px 5px",
              borderRadius: 4,
              fontSize: "0.9em",
            }}
          >
            {p.slice(1, -1)}
          </code>
        );
      }
      return p;
    });
    if (isBullet) {
      return (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>{parts}</span>
        </div>
      );
    }
    if (line === "") return <div key={i} style={{ height: 6 }} />;
    return <div key={i}>{parts}</div>;
  });
}

export const ChatBubble: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [activity, setActivity] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist open/close giữa navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activity]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setMessages((m) => [...m, { role: "user", text, ts: Date.now() }]);
    setInput("");
    setActivity([]);
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
          {
            role: "assistant",
            text: `Lỗi ${res.status}: ${errBody.slice(0, 200)}`,
            ts: Date.now(),
          },
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
              const preview = obj.text.split("\n")[0].slice(0, 90);
              setActivity((a) => [...a.slice(-3), `💭 ${preview}`]);
            } catch { /* ignore */ }
          } else if (eventLine === "tool" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as ToolEvent;
              const lbl = obj.label ?? `🔧 ${obj.name}`;
              setActivity((a) => [...a.slice(-3), lbl]);
            } catch { /* ignore */ }
          } else if (eventLine === "reply" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as { text: string };
              setMessages((m) => [
                ...m,
                { role: "assistant", text: obj.text, ts: Date.now() },
              ]);
            } catch { /* ignore */ }
          } else if (eventLine === "error" && dataLine) {
            try {
              const obj = JSON.parse(dataLine) as { message: string };
              setMessages((m) => [
                ...m,
                { role: "assistant", text: `⚠️ ${obj.message}`, ts: Date.now() },
              ]);
            } catch { /* ignore */ }
          } else if (eventLine === "done") {
            setActivity([]);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `⚠️ ${msg}`, ts: Date.now() },
      ]);
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

  // Portal vào document.body để escape khỏi mọi ancestor có transform/filter
  // (Payload nav layout có nhiều element tạo containing block) — `position:fixed`
  // mới đúng vị trí + z-index không bị che.
  if (!mounted) return null;

  const content = (
    <>
      <style>{INLINE_CSS}</style>

      {/* Floating button */}
      <button
        type="button"
        aria-label={open ? "Đóng chat" : "Mở chat"}
        onClick={() => setOpen((o) => !o)}
        className="sb-chat-fab"
        data-open={open ? "1" : "0"}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="sb-chat-panel" role="dialog" aria-label="SkillBot chat">
          {/* Header */}
          <div className="sb-chat-header">
            <div className="sb-chat-header-left">
              <div className="sb-chat-avatar sb-chat-avatar--brand">
                <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                  <path d="M10.5 11.5L13 16L10.5 20.5M16.5 11.5H21.5M16.5 20.5H21.5"
                    stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="sb-chat-title">SkillBot</div>
                <div className="sb-chat-subtitle">
                  {streaming ? "đang trả lời..." : "Trực tuyến"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={streaming || messages.length === 0}
              title="Xoá lịch sử trò chuyện"
              className="sb-chat-reset"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Xoá</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="sb-chat-messages">
            {messages.length === 0 && !streaming && (
              <div className="sb-chat-empty">
                <div className="sb-chat-empty-icon">💬</div>
                <div className="sb-chat-empty-title">Chào! Tôi giúp gì được cho bạn?</div>
                <div className="sb-chat-empty-hint">
                  Hỏi về đơn hàng, kho vải, định mức, NCC, lịch nhắc, ...
                </div>
                <div className="sb-chat-suggestions">
                  {[
                    "Đơn nào sắp đến hạn?",
                    "Tồn kho vải",
                    "Báo cáo tuần",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="sb-chat-suggestion"
                      onClick={() => setInput(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`sb-chat-row sb-chat-row--${m.role}`}>
                {m.role === "assistant" && (
                  <div className="sb-chat-avatar sb-chat-avatar--ai">S</div>
                )}
                <div className={`sb-chat-bubble sb-chat-bubble--${m.role}`}>
                  {m.role === "assistant" ? renderMarkdown(m.text) : m.text}
                </div>
              </div>
            ))}

            {streaming && (
              <div className="sb-chat-row sb-chat-row--assistant">
                <div className="sb-chat-avatar sb-chat-avatar--ai">S</div>
                <div className="sb-chat-bubble sb-chat-bubble--activity">
                  <div className="sb-chat-typing-row">
                    <div className="sb-chat-typing">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="sb-chat-typing-label">đang xử lý</span>
                  </div>
                  {activity.length > 0 && (
                    <div className="sb-chat-activity-list">
                      {activity.map((a, i) => (
                        <div key={i} className="sb-chat-activity-item">{a}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="sb-chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              placeholder="Nhập câu hỏi..."
              autoFocus
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Gửi"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
};

export default ChatBubble;

const INLINE_CSS = `
.sb-chat-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  z-index: 2147483647;
  background: linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(16,185,129,0.40);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .18s ease, box-shadow .18s ease;
}
.sb-chat-fab:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 12px 32px rgba(16,185,129,0.55);
}
.sb-chat-fab:active { transform: scale(0.96); }

.sb-chat-panel {
  position: fixed;
  right: 24px;
  bottom: 92px;
  width: 400px;
  height: 620px;
  max-height: calc(100vh - 116px);
  background-color: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.22);
  display: flex;
  flex-direction: column;
  z-index: 2147483646;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.55;
  animation: sb-chat-fadein .18s ease;
  isolation: isolate;
}
@media (prefers-color-scheme: dark) {
  .sb-chat-panel {
    background-color: #1a1f2e;
    color: #e5e7eb;
    border-color: #2c3344;
  }
}
@keyframes sb-chat-fadein {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.sb-chat-header {
  padding: 12px 14px;
  background: linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.sb-chat-header-left {
  display: flex; align-items: center; gap: 10px;
}
.sb-chat-title {
  font-weight: 700; font-size: 14px; line-height: 1.1; letter-spacing: -0.01em;
}
.sb-chat-subtitle {
  font-size: 11px; opacity: 0.85; margin-top: 2px;
}
.sb-chat-reset {
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background-color .15s ease, opacity .15s ease;
}
.sb-chat-reset:hover:not(:disabled) { background: rgba(255,255,255,0.24); }
.sb-chat-reset:disabled { opacity: 0.45; cursor: not-allowed; }

.sb-chat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.sb-chat-avatar--brand {
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.3);
}
.sb-chat-avatar--ai {
  background: linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%);
  color: white;
  box-shadow: 0 1px 3px rgba(16,185,129,0.35);
}

.sb-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f9fafb;
}
@media (prefers-color-scheme: dark) {
  .sb-chat-messages {
    background-color: #111623;
  }
}

.sb-chat-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.sb-chat-row--user { justify-content: flex-end; }
.sb-chat-row--assistant { justify-content: flex-start; }

.sb-chat-bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13.5px;
  line-height: 1.55;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.sb-chat-bubble--user {
  background: linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%);
  color: white;
  border-bottom-right-radius: 4px;
}
.sb-chat-bubble--assistant {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}
.sb-chat-bubble--activity {
  background-color: #f3f4f6;
  border: 1px dashed #d1d5db;
  border-bottom-left-radius: 4px;
  font-size: 12px;
  color: #4b5563;
}
@media (prefers-color-scheme: dark) {
  .sb-chat-bubble--assistant {
    background-color: #232938;
    border-color: #2c3344;
    color: #e5e7eb;
  }
  .sb-chat-bubble--activity {
    background-color: #1a1f2e;
    border-color: #2c3344;
    color: #9ca3af;
  }
}

.sb-chat-activity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgb(var(--theme-elevation-150));
}
.sb-chat-activity-item { font-size: 12px; }

.sb-chat-typing-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sb-chat-typing-label {
  font-size: 12px;
  color: rgb(var(--theme-elevation-600));
  font-style: italic;
}
.sb-chat-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}
.sb-chat-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--theme-elevation-300));
  animation: sb-chat-bounce 1.2s infinite ease-in-out;
}
.sb-chat-typing span:nth-child(2) { animation-delay: 0.15s; }
.sb-chat-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes sb-chat-bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.sb-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  padding: 24px 16px;
  gap: 6px;
}
.sb-chat-empty-icon { font-size: 36px; margin-bottom: 4px; }
.sb-chat-empty-title { font-weight: 600; font-size: 14px; }
.sb-chat-empty-hint {
  font-size: 12px;
  opacity: 0.65;
  max-width: 280px;
  line-height: 1.5;
}
.sb-chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 12px;
}
.sb-chat-suggestion {
  background: rgb(var(--theme-elevation-50));
  border: 1px solid rgb(var(--theme-elevation-150));
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;
}
.sb-chat-suggestion:hover {
  background: rgb(var(--theme-elevation-100));
  border-color: rgb(var(--theme-success-250));
}

.sb-chat-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
}
.sb-chat-input input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  color: inherit;
  font-size: 13.5px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
}
.sb-chat-input input:focus {
  border-color: rgb(16,185,129);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
}
@media (prefers-color-scheme: dark) {
  .sb-chat-input {
    background-color: #1a1f2e;
    border-top-color: #2c3344;
  }
  .sb-chat-input input {
    background-color: #232938;
    border-color: #2c3344;
    color: #e5e7eb;
  }
  .sb-chat-input input:focus {
    background-color: #1a1f2e;
  }
}
.sb-chat-input button {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform .12s ease, box-shadow .15s ease, opacity .15s ease;
  box-shadow: 0 2px 6px rgba(16,185,129,0.30);
}
.sb-chat-input button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16,185,129,0.45);
}
.sb-chat-input button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
`;
