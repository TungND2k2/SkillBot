/**
 * Cron job quét tất cả đơn đang chạy → so với cấu hình WorkflowStages
 * → gửi reminder qua Telegram DM theo `stage.reminders`.
 *
 * De-dupe bằng `Order.remindersSent[]` — không spam cùng 1 reminder
 * trong cùng 1 stage. Khi đổi stage, hook trên Order đã reset mảng này.
 *
 * Chạy mỗi giờ là đủ — reminders thường ở granularity ngày.
 */
import { payload, PayloadError } from "../payload/client.js";
import { logger } from "../utils/logger.js";
import type { TelegramChannel } from "../telegram/channel.js";
import { getStage, ACTIVE_STAGE_CODES } from "./stages.js";

interface UserDoc {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  telegramUserId?: string;
}

interface ReminderSent {
  stageCode: string;
  atDay: number;
  kind: string;
  sentAt: string;
}

interface OrderDoc {
  id: string;
  orderCode: string;
  customer?: string | { name?: string };
  status: string;
  stageStartedAt?: string;
  salesperson?: string | UserDoc;
  assignedTo?: string | UserDoc;
  remindersSent?: ReminderSent[];
}

const ACTIVE_STATUSES = ACTIVE_STAGE_CODES;

function customerName(c: OrderDoc["customer"]): string {
  if (!c) return "—";
  if (typeof c === "string") return c;
  return c.name ?? "—";
}

function daysBetween(fromIso: string, to: Date = new Date()): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function fillTemplate(
  msg: string,
  vars: Record<string, string | number>,
): string {
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * Resolve recipient codes ("salesperson", "manager", ...) → list user IDs.
 * Hợp nhất: 1 user xuất hiện ở nhiều recipient code chỉ DM 1 lần.
 */
async function resolveRecipients(
  order: OrderDoc,
  recipientCodes: string[],
  responsibleRole: string,
): Promise<UserDoc[]> {
  const ids = new Set<string>();
  const collected: UserDoc[] = [];

  // Per-order users (salesperson, assignedTo)
  type UserRef = string | UserDoc | undefined;
  const perOrderRefs: Array<{ ref: UserRef; codes: string[] }> = [
    { ref: order.salesperson as UserRef, codes: ["salesperson"] },
    { ref: order.assignedTo as UserRef, codes: ["responsible", "salesperson"] },
  ];
  for (const r of perOrderRefs) {
    if (!recipientCodes.some((c) => r.codes.includes(c))) continue;
    if (!r.ref) continue;
    const userId = typeof r.ref === "string" ? r.ref : r.ref.id;
    if (!userId || ids.has(userId)) continue;
    try {
      const user = await payload.request<UserDoc>(`/api/users/${userId}`);
      if (user.telegramUserId) {
        ids.add(userId);
        collected.push(user);
      }
    } catch (err) {
      logger.debug("Reminder", `failed lookup user ${userId}: ${err}`);
    }
  }

  // Role-based recipients (admin, manager, qc, ...)
  const roleCodes = recipientCodes.filter(
    (c) => !["salesperson", "responsible"].includes(c),
  );
  if (recipientCodes.includes("responsible")) {
    // "responsible" cũng có thể là role responsibleRole của stage
    if (!roleCodes.includes(responsibleRole)) roleCodes.push(responsibleRole);
  }
  for (const role of roleCodes) {
    try {
      const res = await payload.request<{ docs: UserDoc[] }>(`/api/users`, {
        query: { where: { role: { equals: role } }, limit: 50 },
      });
      for (const user of res.docs) {
        if (!user.telegramUserId || ids.has(user.id)) continue;
        ids.add(user.id);
        collected.push(user);
      }
    } catch (err) {
      logger.debug("Reminder", `failed lookup role=${role}: ${err}`);
    }
  }

  return collected;
}

/**
 * Append reminder vào order.remindersSent qua PATCH.
 * Read trước → push → write — chấp nhận race; thực tế cron 1 instance.
 */
async function markReminderSent(
  orderId: string,
  existing: ReminderSent[],
  newOne: ReminderSent,
): Promise<void> {
  await payload.request(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: { remindersSent: [...existing, newOne] },
  });
}

export interface OrderReminderRunOptions {
  telegram: TelegramChannel;
  /** Optional fallback chat khi user không có telegramUserId. */
  adminChatId?: number;
}

export async function runOrderReminders({
  telegram,
  adminChatId,
}: OrderReminderRunOptions): Promise<string> {
  const start = Date.now();
  let reminderCount = 0;
  let processedOrders = 0;

  try {
    // Fetch active orders. Stages giờ hard-code (./stages.ts) — không
    // cần query Workflows/WorkflowStages collection nữa.
    const ordersRes = await payload.request<{ docs: OrderDoc[]; totalDocs: number }>(
      "/api/orders",
      {
        query: {
          where: { status: { in: ACTIVE_STATUSES } },
          limit: 200,
          depth: 0,
        },
      },
    );

    for (const order of ordersRes.docs) {
      processedOrders += 1;
      const stage = getStage(order.status);
      if (!stage || !stage.reminders || stage.reminders.length === 0) continue;
      if (!order.stageStartedAt) continue;

      const daysSinceStart = daysBetween(order.stageStartedAt);
      const sent = order.remindersSent ?? [];

      for (const r of stage.reminders) {
        if (r.atDay > daysSinceStart) continue; // chưa tới
        const alreadySent = sent.some(
          (s) => s.stageCode === stage.code && s.atDay === r.atDay && s.kind === r.kind,
        );
        if (alreadySent) continue;

        const daysOverdue = stage.durationDays
          ? Math.max(0, daysSinceStart - stage.durationDays)
          : 0;
        const text = fillTemplate(r.message, {
          orderCode: order.orderCode,
          customer: customerName(order.customer),
          daysSinceStart,
          daysOverdue,
          stage: stage.name,
        });

        const recipients = await resolveRecipients(
          order,
          r.recipients,
          stage.responsibleRole,
        );

        if (recipients.length === 0 && adminChatId) {
          // Không tìm được user nào → fallback admin
          await telegram.sendMessage(adminChatId, `[fallback] ${text}`);
          reminderCount += 1;
        }

        for (const u of recipients) {
          if (!u.telegramUserId) continue;
          const chatId = Number(u.telegramUserId);
          if (!Number.isFinite(chatId)) continue;
          try {
            await telegram.sendMessage(chatId, text);
            reminderCount += 1;
            logger.info(
              "Reminder",
              `→ ${u.email} (${chatId}) about ${order.orderCode}/${stage.code} day ${r.atDay}`,
            );
          } catch (err) {
            logger.warn("Reminder", `send to ${u.email} failed: ${err}`);
          }
        }

        // De-dup: ghi nhận đã gửi (kể cả khi 0 user — tránh spam mỗi giờ)
        await markReminderSent(order.id, sent, {
          stageCode: stage.code,
          atDay: r.atDay,
          kind: r.kind,
          sentAt: new Date().toISOString(),
        }).catch((err) => logger.warn("Reminder", `mark sent failed: ${err}`));
        sent.push({
          stageCode: stage.code,
          atDay: r.atDay,
          kind: r.kind,
          sentAt: new Date().toISOString(),
        });
      }
    }

    logger.info(
      "Reminder",
      `scan done in ${Date.now() - start}ms — ${processedOrders} orders, ${reminderCount} reminders sent`,
    );
    // Empty string = không spam admin chat. Logs đã có.
    return "";
  } catch (err) {
    if (err instanceof PayloadError) {
      logger.error("Reminder", `payload error: ${err.message}`);
    } else {
      logger.error("Reminder", `failed: ${err}`);
    }
    return "";
  }
}
