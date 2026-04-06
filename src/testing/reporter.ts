import type { DbInstance } from "../db/connection.js";
import { mdToTelegramHtml, splitMessage } from "../channel/telegram/telegram.format.js";
import { logger } from "../utils/logger.js";
import type { ScenarioResult } from "./types.js";

/**
 * Sends live test progress to a specific Telegram chat.
 * Uses the botToken stored on the tenant doc.
 */
export class TelegramReporter {
  private apiBase: string;

  constructor(
    private readonly botToken: string,
    private readonly chatId: number
  ) {
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
  }

  static async create(db: DbInstance, tenantId: string, chatId: number): Promise<TelegramReporter> {
    const tenant = await db.collection("tenants").findOne({ _id: { $eq: (await import("mongodb")).ObjectId.createFromHexString(tenantId) } } as any);
    const botToken = (tenant as any)?.botToken;
    if (!botToken) throw new Error(`No botToken found for tenant ${tenantId}`);
    return new TelegramReporter(botToken, chatId);
  }

  private async send(text: string): Promise<void> {
    const html = mdToTelegramHtml(text);
    const chunks = splitMessage(html);
    for (const chunk of chunks) {
      try {
        await fetch(`${this.apiBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: this.chatId, text: chunk, parse_mode: "HTML" }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        logger.warn("TelegramReporter", `send failed: ${err}`);
      }
    }
  }

  async scenarioStart(name: string, description: string): Promise<void> {
    await this.send(`🧪 **Test: ${name}**\n_${description}_\n${"─".repeat(30)}`);
  }

  async saleMessage(turn: number, message: string): Promise<void> {
    await this.send(`👤 **[Sale #${turn}]** ${message}`);
  }

  async botReply(turn: number, reply: string, durationMs: number): Promise<void> {
    const truncated = reply.length > 800 ? reply.slice(0, 800) + "…" : reply;
    await this.send(`🤖 **[Bot #${turn}]** _(${durationMs}ms)_\n${truncated}`);
  }

  async scenarioEnd(result: ScenarioResult): Promise<void> {
    const icon = result.completed ? "✅" : "❌";
    const elapsed = (result.totalMs / 1000).toFixed(1);
    const status = result.completed ? "Hoàn thành" : (result.error ? `Lỗi: ${result.error}` : "Không hoàn thành (đến giới hạn turn)");
    await this.send(
      `${icon} **Kết quả: ${result.scenarioName}**\n` +
      `• Trạng thái: ${status}\n` +
      `• Số turn: ${result.totalTurns}\n` +
      `• Thời gian: ${elapsed}s\n` +
      `${"─".repeat(30)}`
    );
  }

  async summary(results: ScenarioResult[]): Promise<void> {
    const passed = results.filter(r => r.completed).length;
    const total = results.length;
    const icon = passed === total ? "🎉" : passed === 0 ? "💥" : "⚠️";
    const lines = results.map(r => `${r.completed ? "✅" : "❌"} ${r.scenarioName} (${r.totalTurns} turns)`);
    await this.send(
      `${icon} **Tổng kết test**\n` +
      `Hoàn thành: **${passed}/${total}** kịch bản\n\n` +
      lines.join("\n")
    );
  }

  /** Plain text log (e.g. errors, info) */
  async log(text: string): Promise<void> {
    await this.send(`ℹ️ ${text}`);
  }
}
