import type { DbInstance } from "../../db/connection.js";
import type { Config } from "../../config.js";
import type { Channel } from "../types.js";
import { MessageQueue, type QueueJob } from "../../queue/message-queue.js";
import { runPipeline } from "../../pipeline/pipeline.js";
import { resolveUser, registerUser } from "./registration.js";
import { mdToTelegramHtml, splitMessage } from "./telegram.format.js";
import { logger } from "../../utils/logger.js";
import { newId } from "../../utils/id.js";
import { isStorageConfigured, uploadToS3 } from "../../storage/s3.js";
import { extractText } from "../../storage/extractor.js";
import type { WebUserService } from "../../domain/web-user/web-user.service.js";
import { AppError } from "../../core/errors.js";

const CHANNEL = "telegram";

// ── Telegram Bot API minimal types ───────────────────────────

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TgChat {
  id: number;
  type: string;
}

interface TgFileRef {
  file_id: string;
  file_size?: number;
  file_name?: string;
  mime_type?: string;
  width?: number;
  height?: number;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  caption?: string;
  document?: TgFileRef;
  photo?: TgFileRef[];
  date: number;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

interface TgGetUpdatesResponse {
  ok: boolean;
  result: TgUpdate[];
}

// ── Single bot instance ──────────────────────────────────────

class TelegramBot {
  private offset = 0;
  private polling = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollDelay = 1000; // ms, grows on 409

  constructor(
    readonly tenantId: string,
    readonly botToken: string,
    private readonly db: DbInstance,
    private readonly config: Config,
    private readonly queue: MessageQueue,
    private readonly webUsers: WebUserService,
  ) {}

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  start(): void {
    if (this.polling) return;
    this.polling = true;
    this.poll();
    logger.info("Telegram", `Bot started for tenant ${this.tenantId}`);
  }

  stop(): void {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private poll(): void {
    if (!this.polling) return;
    this.fetchUpdates()
      .catch((err) =>
        logger.error("Telegram", `Poll error (tenant ${this.tenantId})`, err)
      )
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
        // Another instance is polling — back off exponentially up to 30s
        this.pollDelay = Math.min(this.pollDelay * 2, 30_000);
        logger.warn("Telegram", `409 conflict — another instance running? Backing off ${this.pollDelay}ms (tenant ${this.tenantId})`);
      } else {
        logger.warn("Telegram", `getUpdates HTTP ${res.status} (tenant ${this.tenantId})`);
      }
      return;
    }
    // Reset delay on success
    this.pollDelay = 1000;

    const data = (await res.json()) as TgGetUpdatesResponse;
    if (!data.ok || data.result.length === 0) return;

    logger.debug("Telegram", `${data.result.length} update(s) received (tenant ${this.tenantId})`);

    for (const update of data.result) {
      this.offset = update.update_id + 1;
      if (update.message) {
        this.handleMessage(update.message);
      }
    }
  }

  private handleMessage(msg: TgMessage): void {
    // Only handle private messages
    if (msg.chat.type !== "private" || !msg.from) {
      logger.debug("Telegram", `Ignored update: type=${msg.chat.type}`);
      return;
    }

    const chatId = msg.chat.id;
    const from = msg.from;

    // Determine content: file/photo or text
    const fileRef = msg.document ?? (msg.photo ? msg.photo[msg.photo.length - 1] : undefined);
    const isPhoto = !!msg.photo;
    const caption = msg.caption ?? "";
    const text = msg.text?.trim() ?? "";

    if (fileRef) {
      logger.info("Telegram", `File from ${from.first_name} (${from.id}): ${fileRef.file_name ?? "photo"} caption="${caption.slice(0, 40)}"`);
      const job: QueueJob = {
        id: newId(),
        priority: 1,
        enqueuedAt: Date.now(),
        run: () => this.processFile(chatId, from, fileRef, isPhoto, caption),
      };
      const accepted = this.queue.enqueue(job);
      if (!accepted) this.sendMessage(chatId, "Hệ thống đang bận, vui lòng thử lại sau giây lát.").catch(() => {});
      return;
    }

    if (!text) {
      logger.debug("Telegram", `Ignored update: no text and no file`);
      return;
    }

    logger.info("Telegram", `Message from ${from.first_name} (${from.id}): "${text.slice(0, 60)}"`); 

    const job: QueueJob = {
      id: newId(),
      priority: 1,
      enqueuedAt: Date.now(),
      run: () => this.processMessage(chatId, from, text),
    };

    const accepted = this.queue.enqueue(job);
    if (!accepted) {
      this.sendMessage(chatId,
        "Hệ thống đang bận, vui lòng thử lại sau giây lát."
      ).catch(() => {});
    }
  }

  private async processFile(
    chatId: number,
    from: TgUser,
    fileRef: TgFileRef,
    isPhoto: boolean,
    caption: string,
  ): Promise<void> {
    const telegramUserId = String(from.id);
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ");

    const result = await resolveUser(this.db, this.tenantId, telegramUserId, displayName);
    if (result.status !== "ok") {
      await this.sendMessage(chatId, result.message);
      return;
    }
    const { user } = result;

    const fileName = fileRef.file_name ?? (isPhoto ? `photo_${Date.now()}.jpg` : `file_${Date.now()}`);
    const mimeType = fileRef.mime_type ?? (isPhoto ? "image/jpeg" : "application/octet-stream");
    const fileSize = fileRef.file_size ?? 0;

    if (fileSize > 20 * 1024 * 1024) {
      await this.sendMessage(chatId, `⚠️ File quá lớn (${(fileSize / 1024 / 1024).toFixed(1)}MB). Tối đa 20MB.`);
      return;
    }

    const statusMsgId = await this.sendMessage(chatId, `📤 Đang xử lý <b>${fileName}</b>...`);

    try {
      // Download from Telegram
      const fileInfoRes = await fetch(`${this.apiBase}/getFile?file_id=${fileRef.file_id}`, { signal: AbortSignal.timeout(15_000) });
      const fileInfoData = (await fileInfoRes.json()) as { ok: boolean; result: { file_path: string } };
      if (!fileInfoData.ok) throw new Error("getFile failed");
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileInfoData.result.file_path}`;

      const dlRes = await fetch(fileUrl, { signal: AbortSignal.timeout(60_000) });
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
      const buffer = Buffer.from(await dlRes.arrayBuffer());

      // Extract text content
      const { content: extractedContent, truncated } = await extractText(buffer, mimeType, fileName);
      logger.debug("Telegram", `Extracted ${extractedContent.length} chars from ${fileName}${truncated ? " (truncated)" : ""}`);

      // Upload to S3 if configured
      let fileId: string | null = null;
      let s3Note = "";
      if (isStorageConfigured()) {
        const doc = await uploadToS3({
          tenantId: this.tenantId,
          fileName,
          mimeType,
          body: buffer,
          uploadedBy: telegramUserId,
          channel: "telegram",
        });
        fileId = doc._id.toHexString();
        s3Note = `\n📎 File ID: <code>${fileId}</code>`;
      }

      // Build message text for pipeline
      const sizeStr = fileSize > 1024 * 1024
        ? `${(fileSize / 1024 / 1024).toFixed(1)}MB`
        : `${(fileSize / 1024).toFixed(1)}KB`;

      const fileContext = [
        `[FILE: ${fileName} | ${mimeType} | ${sizeStr}${fileId ? ` | id:${fileId}` : ""}]`,
        `CONTENT:`,
        extractedContent,
      ].join("\n");

      const pipelineMessage = caption
        ? `${caption}\n\n${fileContext}`
        : fileContext;

      if (statusMsgId) await this.deleteMessage(chatId, statusMsgId);

      // Run pipeline with file content embedded in message
      const toolLog: string[] = [];
      const onProgress = async (toolName: string): Promise<void> => {
        toolLog.push(`🔧 ${toolName}`);
        const progressMsgId = await this.sendMessage(chatId, toolLog.join("\n"), "");
        if (progressMsgId) setTimeout(() => this.deleteMessage(chatId, progressMsgId), 3000);
      };
      const onThinking = async (text: string): Promise<void> => {
        const thinkMsgId = await this.sendMessage(chatId, `💭 ${text}`, "");
        if (thinkMsgId) setTimeout(() => this.deleteMessage(chatId, thinkMsgId), 8000);
      };

      logger.info("Telegram", `File pipeline start — user=${telegramUserId} role=${user.role} file=${fileName}`);
      const output = await runPipeline({
        tenantId: this.tenantId,
        channel: "telegram",
        channelUserId: telegramUserId,
        userName: user.displayName,
        userRole: user.role,
        message: pipelineMessage,
        db: this.db,
        config: this.config,
        onProgress,
        onThinking,
      });

      const html = mdToTelegramHtml(output.reply) + s3Note;
      const chunks = splitMessage(html);
      for (const chunk of chunks) await this.sendMessage(chatId, chunk);

    } catch (err: any) {
      if (statusMsgId) await this.deleteMessage(chatId, statusMsgId);
      logger.error("Telegram", `File processing failed: ${err.message}`, err);
      await this.sendMessage(chatId, `⚠️ Không xử lý được file: ${err.message}`);
    }
  }

  private async processMessage(
    chatId: number,
    from: TgUser,
    text: string
  ): Promise<void> {
    const telegramUserId = String(from.id);
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ");

    // Handle /register command explicitly
    if (text === "/register") {
      const regResult = await registerUser(this.db, this.tenantId, telegramUserId, displayName);
      if (regResult.status === "already_active") {
        await this.sendMessage(chatId, "✅ Tài khoản của bạn đã được kích hoạt. Bạn có thể nhắn tin bình thường.");
      } else if (regResult.status === "already_pending") {
        await this.sendMessage(chatId, "⏳ Tài khoản của bạn đang chờ phê duyệt từ admin. Vui lòng chờ.");
      } else {
        await this.sendMessage(chatId, "✅ Đã gửi yêu cầu đăng ký! Admin sẽ xem xét và phê duyệt tài khoản của bạn.");
        for (const adminId of regResult.adminChannelUserIds) {
          await this.sendMessage(
            Number(adminId),
            `🔔 <b>Yêu cầu đăng ký mới</b>\n👤 <b>${displayName}</b>\nTelegram ID: <code>${telegramUserId}</code>\n\nSử dụng skill <b>set_user_role</b> hoặc <b>approve_permission</b> để phê duyệt.`
          ).catch(() => {});
        }
        logger.info("Registration", `Notified ${regResult.adminChannelUserIds.length} admin(s) of registration from ${displayName} (${telegramUserId})`);
      }
      return;
    }

    // /setweb <password> — set or change the web dashboard password.
    if (text.startsWith("/setweb")) {
      await this.handleSetWebPassword(chatId, telegramUserId, text);
      return;
    }

    // Resolve user — must be registered and active
    const result = await resolveUser(
      this.db,
      this.tenantId,
      telegramUserId,
      displayName
    );

    if (result.status !== "ok") {
      logger.info("Telegram", `User ${telegramUserId} blocked: ${result.status}`);
      await this.sendMessage(chatId, result.message);
      return;
    }

    const { user } = result;

    // Idempotently keep the web account in sync with the Telegram identity.
    // No-op if it already exists; updates displayName/isActive on drift.
    void this.webUsers
      .upsertFromTelegram({
        tenantId: this.tenantId,
        channel: CHANNEL,
        channelUserId: telegramUserId,
        displayName: user.displayName,
        role: user.role,
        tenantUserId: telegramUserId, // we don't need exact _id here — denorm only
        isActive: true,
      })
      .catch((err) => logger.warn("WebUser", `upsertFromTelegram failed: ${err.message}`));

    // Send a live status message that we'll edit as tools are called
    const statusMsgId = await this.sendMessage(chatId, "⏳ Đang xử lý...", "");

    const toolLog: string[] = [];
    const onProgress = async (toolName: string): Promise<void> => {
      toolLog.push(`🔧 ${toolName}`);
      if (statusMsgId) {
        await this.editMessage(chatId, statusMsgId, toolLog.join("\n"));
      }
      // Keep typing indicator alive
      this.sendChatAction(chatId, "typing").catch(() => {});
    };
    const onThinking = async (text: string): Promise<void> => {
      const html = mdToTelegramHtml(text);
      const chunks = splitMessage(html);
      for (const chunk of chunks) await this.sendMessage(chatId, chunk);
    };

    logger.info("Telegram", `Pipeline start — user=${telegramUserId} role=${user.role}`);
    const output = await runPipeline({
      tenantId: this.tenantId,
      channel: "telegram",
      channelUserId: telegramUserId,
      userName: user.displayName,
      userRole: user.role,
      message: text,
      db: this.db,
      config: this.config,
      onProgress,
      onThinking,
    });

    // Remove the status message before sending the real reply
    if (statusMsgId) await this.deleteMessage(chatId, statusMsgId);

    // Send reply only if not already sent as thinking message
    if (!output.replyAlreadySent) {
      const html = mdToTelegramHtml(output.reply);
      const chunks = splitMessage(html);
      for (const chunk of chunks) await this.sendMessage(chatId, chunk);
    }
  }

  /**
   * /setweb <password> — set/change web dashboard password for the
   * Telegram-linked account. Validates min length, hashes via bcrypt.
   */
  private async handleSetWebPassword(
    chatId: number,
    telegramUserId: string,
    text: string,
  ): Promise<void> {
    const parts = text.split(/\s+/);
    if (parts.length < 2 || !parts[1]) {
      await this.sendMessage(
        chatId,
        "Cú pháp: <code>/setweb &lt;mật khẩu&gt;</code>\nVí dụ: <code>/setweb mypass1234</code>",
      );
      return;
    }
    const password = parts.slice(1).join(" ");
    try {
      const user = await this.webUsers.setPassword(CHANNEL, telegramUserId, password);
      await this.sendMessage(
        chatId,
        `✅ Đã đặt mật khẩu web. Đăng nhập tại dashboard với:\n👤 Tên đăng nhập: <code>${user.username}</code>\n🔑 Mật khẩu: (như vừa đặt)`,
      );
    } catch (err) {
      const msg = err instanceof AppError ? err.message : "Lỗi đặt mật khẩu";
      await this.sendMessage(chatId, `⚠️ ${msg}`);
    }
  }

  async sendMessage(
    chatId: number,
    text: string,
    parseMode: "HTML" | "MarkdownV2" | "" = "HTML"
  ): Promise<number | null> {
    const body: Record<string, unknown> = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    try {
      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        logger.warn("Telegram", `sendMessage failed: ${await res.text()}`);
        return null;
      }
      const data = (await res.json()) as { ok: boolean; result: { message_id: number } };
      return data.ok ? data.result.message_id : null;
    } catch (error) {
      logger.error("Telegram", "sendMessage threw", error);
      return null;
    }
  }

  private async editMessage(chatId: number, messageId: number, text: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch { /* ignore edit errors */ }
  }

  private async deleteMessage(chatId: number, messageId: number): Promise<void> {
    try {
      await fetch(`${this.apiBase}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch { /* ignore delete errors */ }
  }

  private async sendChatAction(chatId: number, action: string): Promise<void> {
    await fetch(`${this.apiBase}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(5_000),
    });
  }
}

// ── Multi-bot channel ────────────────────────────────────────

/**
 * TelegramChannel manages one TelegramBot per active tenant.
 * Loads all tenants with a botToken from DB on start(),
 * and uses a shared MessageQueue for back-pressure.
 */
export class TelegramChannel implements Channel {
  private bots = new Map<string, TelegramBot>();
  private queue: MessageQueue;

  constructor(
    private readonly db: DbInstance,
    private readonly config: Config,
    private readonly webUsers: WebUserService,
  ) {
    this.queue = new MessageQueue(config);
  }

  async start(): Promise<void> {
    const activeTenants = await this.db.collection("tenants")
      .find({ status: "active" })
      .project({ _id: 1, botToken: 1, botUsername: 1 })
      .toArray() as Array<{ _id: unknown; botToken?: string; botUsername?: string }>;

    let started = 0;
    for (const tenant of activeTenants) {
      if (!tenant.botToken) continue;
      const tenantId = String(tenant._id);
      const bot = new TelegramBot(
        tenantId,
        tenant.botToken,
        this.db,
        this.config,
        this.queue,
        this.webUsers,
      );
      this.bots.set(tenantId, bot);
      bot.start();
      started++;
    }

    logger.info("Telegram", `${started} bot(s) started`);
  }

  stop(): void {
    for (const bot of this.bots.values()) bot.stop();
    this.queue.stop();
    this.bots.clear();
    logger.info("Telegram", "All bots stopped");
  }

  /**
   * Send a message to a specific chat from a specific tenant's bot.
   * Used by cron jobs or workflow notifications.
   */
  async sendNotification(
    tenantId: string,
    chatId: number,
    text: string
  ): Promise<void> {
    const bot = this.bots.get(tenantId);
    if (!bot) {
      logger.warn("Telegram", `No bot for tenant ${tenantId} (sendNotification)`);
      return;
    }
    const html = mdToTelegramHtml(text);
    const chunks = splitMessage(html);
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk);
    }
  }
}
