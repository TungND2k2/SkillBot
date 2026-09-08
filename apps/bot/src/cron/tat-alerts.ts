/**
 * Cron job — BÁO CÁO ĐƠN HÀNG hằng ngày (8h sáng VN), gửi qua Telegram.
 *
 * Nội dung 3 tầng:
 *   1. Tổng quan: số đơn đang chạy, đếm theo bước, (doanh số đang mở / công nợ)
 *   2. ⚠️ Cần chú ý: đơn trễ hạn / sắp hạn / kẹt bước — mỗi đơn 1 dòng kèm lý do
 *   3. 📋 Toàn bộ đơn chưa hoàn thành, nhóm theo bước B1 → B6
 *
 * Ngưỡng cảnh báo (spec):
 *   🟡 Sắp đến hạn      — còn ≤7 ngày tới expectedDeliveryDate
 *   🔴 Đơn muộn         — quá expectedDeliveryDate 1–14 ngày
 *   🔴 Trễ nghiêm trọng — quá expectedDeliveryDate >14 ngày
 *   🟠 Kẹt bước         — ở bước hiện tại quá (thời lượng chuẩn + 7 ngày)
 *
 * Người nhận: mọi Telegram user đã chat với bot (trừ bot/blocked) + group
 * có `tatAlertTarget=true`. Dòng tiền (doanh số / công nợ) CHỈ gửi cho user
 * có tài khoản hệ thống liên kết với role admin/manager/accountant; người
 * khác và group nhận bản không có tiền.
 *
 * Job tự gửi tin (không dùng `notify` chung của CronWorker) nên luôn return "".
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
  totalAmount?: number;
  owedAmount?: number;
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

interface TelegramUserDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
  telegramUserId: string;
  username?: string;
  displayName?: string;
  isBot?: boolean;
  blocked?: boolean;
  linkedSystemUser?: string | { id: string; role?: string };
  [key: string]: unknown;
}

/** Role hệ thống được xem dòng doanh số / công nợ. */
const MONEY_ROLES = new Set(["admin", "manager", "accountant"]);

function customerName(c: OrderDoc["customer"]): string {
  if (!c) return "—";
  return typeof c === "string" ? c : c.name ?? "—";
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

interface Flag {
  marker: "🔴" | "🟡" | "🟠";
  reasons: string[];
}

export interface DailyOrderReportOptions {
  telegram: TelegramChannel;
}

export async function runDailyOrderReport(opts: DailyOrderReportOptions): Promise<string> {
  const { telegram } = opts;
  const now = new Date();
  const today = `${fmtDate(now.toISOString())}/${now.getFullYear()}`;

  let orders: OrderDoc[] = [];
  try {
    const res = await payload.request<PayloadFindResponse<OrderDoc>>("/api/orders", {
      query: { where: { status: { in: ACTIVE_STAGE_CODES } }, depth: 1, limit: 0 },
    });
    orders = res.docs;
  } catch (e) {
    logger.error("Cron", `daily-report: fetch orders failed: ${e instanceof PayloadError ? e.message : e}`);
    return "";
  }

  // ── Phân loại cảnh báo ─────────────────────────────────────────
  const flags = new Map<string, Flag>();
  const flag = (o: OrderDoc, marker: Flag["marker"], reason: string) => {
    const f = flags.get(o.id);
    if (!f) {
      flags.set(o.id, { marker, reasons: [reason] });
      return;
    }
    f.reasons.push(reason);
    // 🔴 luôn thắng, 🟠 thắng 🟡
    if (marker === "🔴" || (marker === "🟠" && f.marker === "🟡")) f.marker = marker;
  };

  for (const o of orders) {
    if (o.expectedDeliveryDate) {
      const late = daysBetween(now, new Date(o.expectedDeliveryDate)); // >0 = đã trễ
      if (late > 14) flag(o, "🔴", `trễ hạn ${late} ngày (nghiêm trọng)`);
      else if (late > 0) flag(o, "🔴", `trễ hạn ${late} ngày`);
      else if (late === 0) flag(o, "🟡", "hạn giao hôm nay");
      else if (late >= -7) flag(o, "🟡", `còn ${-late} ngày tới hạn`);
    }
    const stage = getStage(o.status);
    if (stage && o.stageStartedAt) {
      const over = daysBetween(now, new Date(o.stageStartedAt)) - stage.durationDays;
      if (over > 7) flag(o, "🟠", `kẹt ${stage.code.toUpperCase()} quá quy định ${over} ngày`);
    }
  }

  // ── Helpers dựng dòng ──────────────────────────────────────────
  const stageLabel = (code: string) => {
    const s = getStage(code);
    return s ? `${s.code.toUpperCase()} · ${s.name}` : code.toUpperCase();
  };
  const stageDays = (o: OrderDoc) => {
    const s = getStage(o.status);
    if (!s || !o.stageStartedAt) return "";
    return `ngày ${daysBetween(now, new Date(o.stageStartedAt))}/${s.durationDays} ở bước`;
  };
  const deadline = (o: OrderDoc) => {
    if (!o.expectedDeliveryDate) return "chưa có hạn giao";
    const late = daysBetween(now, new Date(o.expectedDeliveryDate));
    const rel = late > 0 ? `trễ ${late} ngày` : late === 0 ? "hôm nay" : `còn ${-late} ngày`;
    return `hạn ${fmtDate(o.expectedDeliveryDate)} (${rel})`;
  };
  const orderLine = (o: OrderDoc) =>
    `• *${o.orderCode}* — ${customerName(o.customer)} · ${[stageDays(o), deadline(o)].filter(Boolean).join(" · ")}${
      flags.has(o.id) ? " ⚠️" : ""
    }`;

  // ── 1. Tổng quan ──────────────────────────────────────────────
  const byStage = new Map<string, OrderDoc[]>();
  for (const o of orders) byStage.set(o.status, [...(byStage.get(o.status) ?? []), o]);
  const stageOrder = [...ACTIVE_STAGE_CODES, ...[...byStage.keys()].filter((k) => !ACTIVE_STAGE_CODES.includes(k))];
  const stageCounts = stageOrder
    .filter((c) => (byStage.get(c)?.length ?? 0) > 0)
    .map((c) => `${c.toUpperCase()}: ${byStage.get(c)!.length}`)
    .join(" · ");

  const revenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const owed = orders.reduce((s, o) => s + (o.owedAmount ?? 0), 0);

  const head = [`📊 *Báo cáo đơn hàng ${today}*`];
  if (orders.length === 0) {
    head.push("Không có đơn nào đang chạy.");
  } else {
    head.push(`Đang chạy: *${orders.length} đơn*${stageCounts ? ` · ${stageCounts}` : ""}`);
  }
  const moneyLine = `Doanh số đang mở: *${money(revenue)}* · Công nợ: *${money(owed)}*`;

  // ── 2. Cần chú ý ──────────────────────────────────────────────
  const attention: string[] = [];
  if (flags.size > 0) {
    const order = { "🔴": 0, "🟠": 1, "🟡": 2 };
    const flagged = orders
      .filter((o) => flags.has(o.id))
      .sort((a, b) => order[flags.get(a.id)!.marker] - order[flags.get(b.id)!.marker]);
    attention.push("", `⚠️ *Cần chú ý (${flagged.length})*`);
    for (const o of flagged) {
      const f = flags.get(o.id)!;
      attention.push(`${f.marker} *${o.orderCode}* — ${customerName(o.customer)} · ${f.reasons.join(" · ")}`);
    }
  }

  // ── 3. Theo bước ──────────────────────────────────────────────
  const list: string[] = [];
  if (orders.length > 0) {
    list.push("", `📋 *Đơn chưa hoàn thành — theo bước*`);
    for (const code of stageOrder) {
      const items = byStage.get(code);
      if (!items?.length) continue;
      items.sort((a, b) => (a.expectedDeliveryDate ?? "9").localeCompare(b.expectedDeliveryDate ?? "9"));
      list.push("", `*${stageLabel(code)}* (${items.length})`, ...items.map(orderLine));
    }
  }

  const body = [...attention, ...list];
  const textFull = [...head, moneyLine, ...body].join("\n");
  const textBasic = [...head, ...body].join("\n");

  // ── Người nhận ────────────────────────────────────────────────
  const recipients = new Map<number, { label: string; full: boolean }>();

  try {
    const res = await payload.request<PayloadFindResponse<TelegramUserDoc>>("/api/telegram-users", {
      query: {
        where: { and: [{ isBot: { not_equals: true } }, { blocked: { not_equals: true } }] },
        depth: 1, // populate linkedSystemUser → role
        limit: 0,
      },
    });
    for (const u of res.docs) {
      const id = Number(u.telegramUserId);
      if (!Number.isFinite(id)) continue;
      const role = typeof u.linkedSystemUser === "object" ? u.linkedSystemUser?.role : undefined;
      recipients.set(id, {
        label: u.displayName || u.username || String(id),
        full: !!role && MONEY_ROLES.has(role),
      });
    }
  } catch (e) {
    logger.error("Cron", `daily-report: fetch telegram-users failed: ${e instanceof PayloadError ? e.message : e}`);
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
      if (Number.isFinite(id)) recipients.set(id, { label: g.title || String(id), full: false });
    }
  } catch (e) {
    logger.error("Cron", `daily-report: fetch telegram-groups failed: ${e instanceof PayloadError ? e.message : e}`);
  }

  if (recipients.size === 0) {
    logger.warn("Cron", "daily-report: no recipients (no telegram-users yet, no flagged groups) — not sent");
    return "";
  }

  let sent = 0;
  for (const [chatId, r] of recipients) {
    try {
      await telegram.sendMessage(chatId, r.full ? textFull : textBasic);
      sent++;
    } catch (e) {
      logger.error("Cron", `daily-report: send to ${r.label} (${chatId}) failed: ${e}`);
    }
  }
  logger.info(
    "Cron",
    `daily-report: sent to ${sent}/${recipients.size} recipients (${orders.length} orders, ${flags.size} flagged)`,
  );

  return "";
}
