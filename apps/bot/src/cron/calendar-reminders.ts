/**
 * Cron worker quét collection `reminders` (Calendar event do admin tạo)
 * → DM Telegram → đánh dấu sent.
 *
 * Schedule: mỗi 5 phút (granularity ngày+giờ, không cần realtime).
 *
 * Logic:
 *   1. Find reminders status='scheduled' AND dueAt <= now + notifyMinutesBefore
 *   2. Resolve recipients = recipients[] ∪ users with role ∈ recipientRoles
 *   3. Compose message từ title + dueAt + linkedTo (nếu type='linked')
 *   4. DM từng user qua Telegram (skip user không có telegramUserId)
 *   5. PATCH reminder.status='sent', sentAt=now (dedupe)
 */
import { payload, PayloadError } from "../payload/client.js";
import { logger } from "../utils/logger.js";
import type { TelegramChannel } from "../telegram/channel.js";

interface UserDoc {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  telegramUserId?: string;
  isActive?: boolean;
}

interface LinkedRef {
  relationTo: string;
  value: string | { id: string; [k: string]: unknown };
}

interface ReminderRow {
  id: string;
  title: string;
  description?: string;
  type: "standalone" | "linked";
  dueAt: string;
  notifyMinutesBefore?: number;
  linkedTo?: LinkedRef | null;
  recipients?: Array<string | UserDoc>;
  recipientRoles?: string[];
  status: "scheduled" | "sent" | "cancelled";
}

const COLLECTION_LABEL: Record<string, string> = {
  orders: "Đơn",
  customers: "Khách",
  fabrics: "Vải",
  suppliers: "NCC",
  workers: "LĐ",
  contracts: "HĐ",
  "order-workers": "Ứng viên",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

async function resolveLinkedRef(
  ref: LinkedRef | null | undefined,
): Promise<string> {
  if (!ref) return "";
  const id = typeof ref.value === "string" ? ref.value : ref.value?.id;
  if (!id) return "";
  const label = COLLECTION_LABEL[ref.relationTo] ?? ref.relationTo;
  try {
    const doc = await payload.request<{ orderCode?: string; name?: string; code?: string; fullName?: string }>(
      `/api/${ref.relationTo}/${encodeURIComponent(String(id))}`,
    );
    const title = doc.orderCode ?? doc.code ?? doc.fullName ?? doc.name ?? id;
    return `${label}: ${title}`;
  } catch {
    return `${label}: ${id}`;
  }
}

async function resolveRecipients(
  reminder: ReminderRow,
): Promise<UserDoc[]> {
  const ids = new Set<string>();
  const collected: UserDoc[] = [];

  // Per-user
  for (const r of reminder.recipients ?? []) {
    const uid = typeof r === "string" ? r : r.id;
    if (!uid || ids.has(uid)) continue;
    try {
      const u = await payload.request<UserDoc>(`/api/users/${uid}`);
      if (u.telegramUserId && u.isActive !== false) {
        ids.add(uid);
        collected.push(u);
      }
    } catch (err) {
      logger.debug("CalReminder", `failed lookup user ${uid}: ${err}`);
    }
  }

  // Role-based
  for (const role of reminder.recipientRoles ?? []) {
    try {
      const res = await payload.request<{ docs: UserDoc[] }>("/api/users", {
        query: { where: { role: { equals: role } }, limit: 50, depth: 0 },
      });
      for (const u of res.docs) {
        if (!u.telegramUserId || u.isActive === false || ids.has(u.id)) continue;
        ids.add(u.id);
        collected.push(u);
      }
    } catch (err) {
      logger.debug("CalReminder", `failed lookup role=${role}: ${err}`);
    }
  }

  return collected;
}

function fillTemplate(
  msg: string,
  vars: Record<string, string>,
): string {
  return msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export interface CalendarReminderRunOptions {
  telegram: TelegramChannel;
  /** Nếu user không có Telegram, vẫn DM admin chat để admin biết. */
  adminChatId?: number;
}

export async function runCalendarReminders({
  telegram,
  adminChatId,
}: CalendarReminderRunOptions): Promise<string> {
  const start = Date.now();
  let dmCount = 0;
  let processed = 0;

  try {
    const now = Date.now();
    // Lấy reminders đang active. Logic notifyMinutesBefore tính trong RAM
    // (Payload where không hỗ trợ phép cộng field+const).
    const res = await payload.request<{ docs: ReminderRow[]; totalDocs: number }>(
      "/api/reminders",
      {
        query: {
          where: { status: { equals: "scheduled" } },
          limit: 200,
          depth: 0,
        },
      },
    );

    for (const r of res.docs) {
      const due = new Date(r.dueAt).getTime();
      const notifyMs = (r.notifyMinutesBefore ?? 0) * 60_000;
      // Đến giờ nhắc?
      if (due - notifyMs > now) continue;
      processed += 1;

      const linkRef = await resolveLinkedRef(r.linkedTo);
      const vars = {
        title: r.title,
        dueAt: fmtDateTime(r.dueAt),
        linkRef,
      };

      const lines: string[] = [];
      lines.push(`🔔 ${r.title}`);
      lines.push(`⏰ ${fmtDateTime(r.dueAt)}`);
      if (linkRef) lines.push(`🔗 ${linkRef}`);
      if (r.description) {
        const body = fillTemplate(r.description, vars);
        lines.push("");
        lines.push(body);
      }
      const text = lines.join("\n");

      const recipients = await resolveRecipients(r);

      if (recipients.length === 0 && adminChatId) {
        await telegram.sendMessage(adminChatId, `[fallback] ${text}`);
        dmCount += 1;
      }

      for (const u of recipients) {
        if (!u.telegramUserId) continue;
        const chatId = Number(u.telegramUserId);
        if (!Number.isFinite(chatId)) continue;
        try {
          await telegram.sendMessage(chatId, text);
          dmCount += 1;
          logger.info(
            "CalReminder",
            `→ ${u.email ?? u.id} (${chatId}) for "${r.title}"`,
          );
        } catch (err) {
          logger.warn("CalReminder", `send to ${u.email ?? u.id} failed: ${err}`);
        }
      }

      // Mark sent (dedupe). Nếu manager muốn nhắc lại thì đổi status về scheduled
      // hoặc tạo reminder mới.
      try {
        await payload.request(`/api/reminders/${r.id}`, {
          method: "PATCH",
          body: { status: "sent", sentAt: new Date().toISOString() },
        });
      } catch (err) {
        logger.warn("CalReminder", `mark sent #${r.id} failed: ${err}`);
      }
    }

    logger.info(
      "CalReminder",
      `scan done in ${Date.now() - start}ms — ${processed} due, ${dmCount} DMs sent`,
    );
    return "";
  } catch (err) {
    if (err instanceof PayloadError) {
      logger.error("CalReminder", `payload error: ${err.message}`);
    } else {
      logger.error("CalReminder", `failed: ${err}`);
    }
    return "";
  }
}
