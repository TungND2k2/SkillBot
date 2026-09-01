/**
 * Cron job — digest cảnh báo TAT hằng ngày, gửi vào các group Telegram
 * có `tatAlertTarget=true` (cấu hình trong CMS admin, collection
 * TelegramGroups).
 *
 * 4 mức (theo spec logic bot):
 *   🟡 Sắp đến hạn     — còn ≤7 ngày tới expectedDeliveryDate
 *   🔴 Đơn muộn        — đã quá expectedDeliveryDate
 *   🔴 Trễ nghiêm trọng — quá expectedDeliveryDate hơn 14 ngày (thay thế mức 🔴 thường)
 *   🟠 Cần xử lý       — bước hiện tại không có cập nhật (stageStartedAt) quá
 *                        (thời lượng chuẩn của bước + 7 ngày)
 *
 * Không dedupe theo từng đơn — mỗi ngày gửi lại digest hiện trạng đầy đủ
 * là đúng yêu cầu "theo mỗi ngày cảnh báo". Job tự gửi tin (không dùng
 * cơ chế `notify` chung của CronWorker) nên luôn return "".
 */
import { payload, PayloadError } from "../payload/client.js";
import { logger } from "../utils/logger.js";
import type { TelegramChannel } from "../telegram/channel.js";
import { getStage, ACTIVE_STAGE_CODES } from "./stages.js";
import type { PayloadFindResponse } from "../payload/types.js";

interface OrderDoc {
  id: string;
  orderCode: string;
  customer?: string | { name?: string };
  status: string;
  expectedDeliveryDate?: string;
  stageStartedAt?: string;
}

interface TelegramGroupDoc {
  id: string;
  telegramChatId: string;
  title?: string;
  active?: boolean;
  tatAlertTarget?: boolean;
}

function customerName(c: OrderDoc["customer"]): string {
  if (!c) return "—";
  return typeof c === "string" ? c : c.name ?? "—";
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

interface FlaggedOrder {
  order: OrderDoc;
  days: number;
}

export interface TatAlertsOptions {
  telegram: TelegramChannel;
}

export async function runTatAlerts(opts: TatAlertsOptions): Promise<string> {
  const { telegram } = opts;
  const now = new Date();

  let orders: OrderDoc[] = [];
  try {
    const res = await payload.request<PayloadFindResponse<OrderDoc>>("/api/orders", {
      query: {
        where: { status: { in: ACTIVE_STAGE_CODES } },
        depth: 1,
        limit: 0,
      },
    });
    orders = res.docs;
  } catch (e) {
    logger.error("Cron", `tat-alerts: fetch orders failed: ${e instanceof PayloadError ? e.message : e}`);
    return "";
  }

  const dueSoon: FlaggedOrder[] = [];
  const overdue: FlaggedOrder[] = [];
  const critical: FlaggedOrder[] = [];
  const stalled: FlaggedOrder[] = [];

  for (const order of orders) {
    if (order.expectedDeliveryDate) {
      const deadline = new Date(order.expectedDeliveryDate);
      const daysToDeadline = daysBetween(deadline, now); // >0 nghĩa là đã quá hạn
      if (daysToDeadline > 14) {
        critical.push({ order, days: daysToDeadline });
      } else if (daysToDeadline > 0) {
        overdue.push({ order, days: daysToDeadline });
      } else if (daysToDeadline >= -7) {
        dueSoon.push({ order, days: -daysToDeadline });
      }
    }

    if (order.stageStartedAt) {
      const stage = getStage(order.status);
      if (stage) {
        const daysSinceStart = daysBetween(now, new Date(order.stageStartedAt));
        const daysStalled = daysSinceStart - stage.durationDays;
        if (daysStalled > 7) {
          stalled.push({ order, days: daysStalled });
        }
      }
    }
  }

  if (dueSoon.length === 0 && overdue.length === 0 && critical.length === 0 && stalled.length === 0) {
    return "";
  }

  const line = (f: FlaggedOrder, suffix: string) =>
    `• ${f.order.orderCode} (${customerName(f.order.customer)}) — ${f.days} ngày ${suffix}`;

  const sections: string[] = [`📅 *Cảnh báo TAT ${now.toISOString().slice(0, 10)}*`];
  if (critical.length > 0) {
    sections.push("", `🔴 *Trễ nghiêm trọng (>14 ngày)*`, ...critical.map((f) => line(f, "trễ")));
  }
  if (overdue.length > 0) {
    sections.push("", `🔴 *Đơn muộn*`, ...overdue.map((f) => line(f, "trễ")));
  }
  if (dueSoon.length > 0) {
    sections.push("", `🟡 *Sắp đến hạn (≤7 ngày)*`, ...dueSoon.map((f) => line(f, "còn lại")));
  }
  if (stalled.length > 0) {
    sections.push("", `🟠 *Cần xử lý — im lặng quá lâu*`, ...stalled.map((f) => line(f, "quá hạn bước hiện tại")));
  }
  const text = sections.join("\n");

  let groups: TelegramGroupDoc[] = [];
  try {
    const res = await payload.request<PayloadFindResponse<TelegramGroupDoc>>("/api/telegram-groups", {
      query: {
        where: { and: [{ tatAlertTarget: { equals: true } }, { active: { equals: true } }] },
        limit: 0,
      },
    });
    groups = res.docs;
  } catch (e) {
    logger.error("Cron", `tat-alerts: fetch groups failed: ${e instanceof PayloadError ? e.message : e}`);
    return "";
  }

  if (groups.length === 0) {
    logger.warn("Cron", "tat-alerts: no telegram-groups with tatAlertTarget=true — digest not sent");
    return "";
  }

  for (const g of groups) {
    const chatId = Number(g.telegramChatId);
    if (!Number.isFinite(chatId)) continue;
    try {
      await telegram.sendMessage(chatId, text);
    } catch (e) {
      logger.error("Cron", `tat-alerts: send to ${g.telegramChatId} failed: ${e}`);
    }
  }

  return "";
}
