/**
 * Cron job — digest cảnh báo TAT hằng ngày. Gửi DM cho mọi Telegram user
 * đã từng chat với bot (collection TelegramUsers, trừ bot/blocked) và thêm
 * các group có `tatAlertTarget=true` (TelegramGroups) nếu được tick.
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
  createdAt: string;
  updatedAt: string;
  orderCode: string;
  customer?: string | { name?: string };
  status: string;
  expectedDeliveryDate?: string;
  stageStartedAt?: string;
  [key: string]: unknown;
}

interface TelegramGroupDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
  telegramChatId: string;
  title?: string;
  active?: boolean;
  tatAlertTarget?: boolean;
  [key: string]: unknown;
}

function customerName(c: OrderDoc["customer"]): string {
  if (!c) return "—";
  return typeof c === "string" ? c : c.name ?? "—";
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

interface TelegramUserDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
  telegramUserId: string;
  username?: string;
  displayName?: string;
  isBot?: boolean;
  blocked?: boolean;
  [key: string]: unknown;
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

  const nothingFlagged =
    dueSoon.length === 0 && overdue.length === 0 && critical.length === 0 && stalled.length === 0;

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const today = fmtDate(now.toISOString()) + "/" + now.getFullYear();

  /** "B4 Gửi NCC · ở bước 6/1 ngày" — bước hiện tại + đã ở đó bao lâu so với quy định. */
  const stageInfo = (o: OrderDoc): string => {
    const stage = getStage(o.status);
    const label = stage ? `${stage.code.toUpperCase()} ${stage.name}` : o.status.toUpperCase();
    if (!o.stageStartedAt || !stage) return label;
    const inStage = daysBetween(now, new Date(o.stageStartedAt));
    return `${label} · ở bước ${inStage}/${stage.durationDays} ngày`;
  };

  /** Hạn giao + còn/trễ bao nhiêu ngày. */
  const deadlineInfo = (o: OrderDoc): string => {
    if (!o.expectedDeliveryDate) return "chưa có hạn giao";
    const diff = daysBetween(new Date(o.expectedDeliveryDate), now); // >0 = đã trễ
    const rel = diff > 0 ? `trễ ${diff} ngày` : diff === 0 ? "hạn hôm nay" : `còn ${-diff} ngày`;
    return `hạn ${fmtDate(o.expectedDeliveryDate)} (${rel})`;
  };

  const describe = (o: OrderDoc, extra?: string) =>
    `• *${o.orderCode}* — ${customerName(o.customer)}\n   ${stageInfo(o)}\n   ${deadlineInfo(o)}${extra ? ` · ${extra}` : ""}`;

  const sections: string[] = [`📅 *Cảnh báo TAT ${today}* — ${orders.length} đơn đang chạy`];
  if (critical.length > 0) {
    sections.push("", `🔴 *Trễ nghiêm trọng (>14 ngày)* — ${critical.length} đơn`, ...critical.map((f) => describe(f.order)));
  }
  if (overdue.length > 0) {
    sections.push("", `🔴 *Đơn muộn (1–14 ngày)* — ${overdue.length} đơn`, ...overdue.map((f) => describe(f.order)));
  }
  if (dueSoon.length > 0) {
    sections.push("", `🟡 *Sắp đến hạn (≤7 ngày)* — ${dueSoon.length} đơn`, ...dueSoon.map((f) => describe(f.order)));
  }
  if (stalled.length > 0) {
    sections.push(
      "",
      `🟠 *Kẹt bước — không cập nhật* — ${stalled.length} đơn`,
      ...stalled.map((f) => describe(f.order, `quá quy định bước ${f.days} ngày`)),
    );
  }
  // Vẫn gửi khi không có gì — như 1 nhịp "job còn sống", kèm tình hình từng đơn.
  const MAX_LIST = 20;
  const allClear = [
    `✅ *TAT ${today}* — ${orders.length} đơn đang chạy, không có đơn nào sắp hạn / trễ / kẹt bước.`,
    "",
    ...orders.slice(0, MAX_LIST).map((o) => describe(o)),
    ...(orders.length > MAX_LIST ? [`… và ${orders.length - MAX_LIST} đơn khác`] : []),
  ];
  const text = nothingFlagged ? allClear.join("\n") : sections.join("\n");

  // Người nhận = mọi user đã từng chat với bot (DM) + group nào được tick
  // tatAlertTarget. Gộp trùng theo chatId. Không bắt buộc phải có group.
  const recipients = new Map<number, string>();

  try {
    const res = await payload.request<PayloadFindResponse<TelegramUserDoc>>("/api/telegram-users", {
      query: {
        where: { and: [{ isBot: { not_equals: true } }, { blocked: { not_equals: true } }] },
        limit: 0,
      },
    });
    for (const u of res.docs) {
      const id = Number(u.telegramUserId);
      if (Number.isFinite(id)) recipients.set(id, u.displayName || u.username || String(id));
    }
  } catch (e) {
    logger.error("Cron", `tat-alerts: fetch telegram-users failed: ${e instanceof PayloadError ? e.message : e}`);
  }

  try {
    const res = await payload.request<PayloadFindResponse<TelegramGroupDoc>>("/api/telegram-groups", {
      query: {
        where: { and: [{ tatAlertTarget: { equals: true } }, { active: { equals: true } }] },
        limit: 0,
      },
    });
    for (const g of res.docs) {
      const id = Number(g.telegramChatId);
      if (Number.isFinite(id)) recipients.set(id, g.title || String(id));
    }
  } catch (e) {
    logger.error("Cron", `tat-alerts: fetch telegram-groups failed: ${e instanceof PayloadError ? e.message : e}`);
  }

  if (recipients.size === 0) {
    logger.warn("Cron", "tat-alerts: no recipients (no telegram-users yet, no flagged groups) — digest not sent");
    return "";
  }

  let sent = 0;
  for (const [chatId, label] of recipients) {
    try {
      await telegram.sendMessage(chatId, text);
      sent++;
    } catch (e) {
      logger.error("Cron", `tat-alerts: send to ${label} (${chatId}) failed: ${e}`);
    }
  }
  logger.info("Cron", `tat-alerts: digest sent to ${sent}/${recipients.size} recipients`);

  return "";
}
