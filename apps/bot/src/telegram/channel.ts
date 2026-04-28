/**
 * Telegram channel — long-poll Telegram Bot API, push messages onto
 * the queue, run pipeline, send reply back.
 *
 * Trimmed from the previous implementation — removed multi-tenant
 * lookup (Payload handles user identity now) and file extractor
 * coupling (will re-add when Payload media is wired up).
 */
import type { Config } from "../config.js";
import { logger } from "../utils/logger.js";
import { newId } from "../utils/id.js";
import { MessageQueue, type QueueJob } from "../queue/message-queue.js";
import { runPipeline } from "../pipeline/pipeline.js";
import { mdToTelegramHtml, splitMessage } from "./format.js";
import { describeToolCall } from "./tool-labels.js";

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  date: number;
}
interface TgUpdate { update_id: number; message?: TgMessage }
interface TgUpdatesResponse { ok: boolean; result: TgUpdate[] }

export class TelegramChannel {
  private offset = 0;
  private polling = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private pollDelay = 1000;
  private readonly queue: MessageQueue;

  constructor(
    private readonly botToken: string,
    private readonly config: Config,
  ) {
    this.queue = new MessageQueue(config);
  }

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  start(): void {
    if (this.polling) return;
    this.polling = true;
    this.poll();
    logger.info("Telegram", "Polling started");
  }

  stop(): void {
    this.polling = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.queue.stop();
  }

  /** Send a message to a chat — also exposed for cron worker notifications. */
  async sendMessage(chatId: number, text: string): Promise<void> {
    const html = mdToTelegramHtml(text);
    for (const chunk of splitMessage(html)) {
      try {
        await fetch(`${this.apiBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: "HTML",
          }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (e) {
        logger.warn("Telegram", `sendMessage failed: ${e}`);
      }
    }
  }

  // ── Polling loop ──────────────────────────────────────────────

  private poll(): void {
    if (!this.polling) return;
    this.fetchUpdates()
      .catch((err) => logger.warn("Telegram", `poll error: ${err}`))
      .finally(() => {
        if (this.polling) {
          this.pollTimer = setTimeout(() => this.poll(), this.pollDelay);
        }
      });
  }

  private async fetchUpdates(): Promise<void> {
    const url = `${this.apiBase}/getUpdates?timeout=25&offset=${this.offset}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });

    if (!res.ok) {
      if (res.status === 409) {
        // Another instance is polling; back off.
        this.pollDelay = Math.min(this.pollDelay * 2, 30_000);
        logger.warn("Telegram", `409 conflict, backing off ${this.pollDelay}ms`);
      } else {
        logger.warn("Telegram", `getUpdates HTTP ${res.status}`);
      }
      return;
    }
    this.pollDelay = 1000;

    const data = (await res.json()) as TgUpdatesResponse;
    if (!data.ok || data.result.length === 0) return;

    for (const update of data.result) {
      this.offset = update.update_id + 1;
      if (update.message?.text && update.message.chat.type === "private") {
        this.handleMessage(update.message);
      }
    }
  }

  private handleMessage(msg: TgMessage): void {
    if (!msg.from || !msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    const job: QueueJob = {
      id: newId(),
      priority: 1,
      enqueuedAt: Date.now(),
      run: () => this.processMessage(chatId, text),
    };

    if (!this.queue.enqueue(job)) {
      this.sendMessage(chatId, "Hệ thống đang bận, vui lòng thử lại sau giây lát.")
        .catch(() => {});
    }
  }

  private async processMessage(chatId: number, text: string): Promise<void> {
    logger.info("Telegram", `[${chatId}] ${text.slice(0, 80)}`);

    // Initial status message — edit it as tools are called.
    const statusMsgId = await this.sendPlainMessage(chatId, "💭 Đang nghĩ...");
    const activityLog: string[] = [];
    let lastEditAt = 0;
    let pendingEdit: NodeJS.Timeout | null = null;

    const refreshTyping = () => {
      void fetch(`${this.apiBase}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    };
    refreshTyping();

    const flushEdit = () => {
      if (statusMsgId === null) return;
      lastEditAt = Date.now();
      const body = activityLog.join("\n");
      void this.editMessage(chatId, statusMsgId, body || "💭 Đang nghĩ...");
    };

    const queueEdit = () => {
      if (statusMsgId === null) return;
      const now = Date.now();
      const sinceLast = now - lastEditAt;
      if (sinceLast > 800) {
        // Edit ngay
        if (pendingEdit) { clearTimeout(pendingEdit); pendingEdit = null; }
        flushEdit();
      } else if (!pendingEdit) {
        // Trì hoãn để gom edit, tránh rate-limit Telegram
        pendingEdit = setTimeout(() => {
          pendingEdit = null;
          flushEdit();
        }, 800 - sinceLast);
      }
    };

    const result = await runPipeline({
      message: text,
      onToolCall: (name, args) => {
        const label = describeToolCall(name, args);
        activityLog.push(label);
        refreshTyping();
        queueEdit();
      },
      onThinking: (txt) => {
        // AI có suy nghĩ trước khi gọi tool — preview ngắn lên status.
        const preview = txt.split("\n")[0].slice(0, 80);
        if (preview) activityLog.push(`💭 ${preview}${txt.length > 80 ? "…" : ""}`);
        queueEdit();
      },
    });

    if (pendingEdit) clearTimeout(pendingEdit);
    if (statusMsgId !== null) await this.deleteMessage(chatId, statusMsgId);
    await this.sendMessage(chatId, result.reply);
  }

  private async sendPlainMessage(chatId: number, text: string): Promise<number | null> {
    try {
      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
      return data.ok && data.result ? data.result.message_id : null;
    } catch { return null; }
  }

  private async editMessage(chatId: number, messageId: number, text: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch { /* ignore */ }
  }

  private async deleteMessage(chatId: number, messageId: number): Promise<void> {
    try {
      await fetch(`${this.apiBase}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch { /* ignore */ }
  }
}
