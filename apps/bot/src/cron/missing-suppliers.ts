/**
 * Quét đơn active → check NCC bắt buộc còn thiếu → DM Sales của đơn.
 *
 * Required roles theo guide:
 *   - fabric_main  : vải chính
 *   - accessory    : NPL (ren, cúc, ruy băng)
 *   - embroidery   : xưởng thêu
 *   - sewing       : xưởng may
 *
 * Optional (không cảnh báo): fabric_secondary, fabric_printing, logistics
 * (logistics chỉ cần ở B6 — sẽ thêm guard sau nếu cần).
 *
 * Dedupe qua `Order.supplierLastWarnedAt` — không nhắc lại trong 2h.
 *
 * Schedule: mỗi giờ phút thứ 25 (lệch các cron khác 5-20 phút).
 */
import { payload, PayloadError } from "../payload/client.js";
import { logger } from "../utils/logger.js";
import type { TelegramChannel } from "../telegram/channel.js";

const REQUIRED_ROLES = [
  "fabric_main",
  "accessory",
  "embroidery",
  "sewing",
] as const;

const ROLE_LABEL: Record<string, string> = {
  fabric_main: "Vải chính",
  fabric_secondary: "Vải phụ",
  accessory: "NPL (ren/cúc/ruy băng)",
  embroidery: "Xưởng thêu",
  sewing: "Xưởng may",
  fabric_printing: "In vải",
  logistics: "Vận chuyển",
};

const ACTIVE_STATUSES = ["b1", "b2", "b3", "b4", "b5", "b6"];
const WARN_INTERVAL_MS = 2 * 60 * 60 * 1000;

interface OrderRow {
  id: string;
  orderCode: string;
  status: string;
  customer?: string | { name?: string };
  salesperson?: string | { id: string };
  supplierLastWarnedAt?: string;
  suppliers?: Array<{ role: string; supplier?: unknown }>;
}

interface UserDoc {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  telegramUserId?: string;
}

function customerName(c: OrderRow["customer"]): string {
  if (!c) return "—";
  if (typeof c === "string") return c;
  return c.name ?? "—";
}

export interface MissingSupplierRunOptions {
  telegram: TelegramChannel;
  /** Nếu sales không có Telegram → fallback admin chat. */
  adminChatId?: number;
}

export async function runMissingSupplierWarnings({
  telegram,
  adminChatId,
}: MissingSupplierRunOptions): Promise<string> {
  const start = Date.now();
  let scanned = 0;
  let warned = 0;

  try {
    const res = await payload.request<{ docs: OrderRow[]; totalDocs: number }>(
      "/api/orders",
      {
        query: {
          where: { status: { in: ACTIVE_STATUSES } },
          limit: 200,
          depth: 0,
        },
      },
    );

    const now = Date.now();

    for (const o of res.docs) {
      scanned += 1;
      const configured = new Set(
        (o.suppliers ?? [])
          .filter((s) => !!s.supplier)
          .map((s) => s.role),
      );
      const missing = REQUIRED_ROLES.filter((r) => !configured.has(r));
      if (missing.length === 0) continue;

      // Dedupe — không spam < 2h
      const lastWarn = o.supplierLastWarnedAt
        ? new Date(o.supplierLastWarnedAt).getTime()
        : 0;
      if (now - lastWarn < WARN_INTERVAL_MS) continue;

      // Resolve sales
      const salesId =
        typeof o.salesperson === "string"
          ? o.salesperson
          : o.salesperson?.id;
      let chatId: number | null = null;
      let salesEmail = "—";
      if (salesId) {
        try {
          const u = await payload.request<UserDoc>(`/api/users/${salesId}`);
          salesEmail = u.email ?? u.id;
          if (u.telegramUserId) {
            const cid = Number(u.telegramUserId);
            if (Number.isFinite(cid)) chatId = cid;
          }
        } catch (err) {
          logger.debug("MissingSupplier", `lookup sales ${salesId} failed: ${err}`);
        }
      }

      const lines = [
        `⚠️ *Đơn ${o.orderCode}* (${customerName(o.customer)}) đang ở ${o.status.toUpperCase()} nhưng còn thiếu NCC:`,
        "",
        ...missing.map((r) => `  • ${ROLE_LABEL[r] ?? r}`),
        "",
        `Vào admin → Đơn hàng → ${o.orderCode} → tab *Nhà cung cấp* để cấu hình.`,
        `Tôi sẽ nhắc lại sau 2 giờ nếu vẫn thiếu.`,
      ];
      const text = lines.join("\n");

      if (chatId) {
        try {
          await telegram.sendMessage(chatId, text);
          warned += 1;
          logger.info(
            "MissingSupplier",
            `→ ${salesEmail} (${chatId}) for ${o.orderCode}: missing [${missing.join(", ")}]`,
          );
        } catch (err) {
          logger.warn("MissingSupplier", `send to ${salesEmail} failed: ${err}`);
        }
      } else if (adminChatId) {
        try {
          await telegram.sendMessage(adminChatId, `[fallback — sales không có Telegram]\n${text}`);
          warned += 1;
        } catch (err) {
          logger.warn("MissingSupplier", `fallback admin DM failed: ${err}`);
        }
      } else {
        logger.warn("MissingSupplier", `${o.orderCode} missing [${missing.join(", ")}] — no recipient`);
      }

      // Update timestamp dù không có recipient để không retry liên tục
      try {
        await payload.request(`/api/orders/${o.id}`, {
          method: "PATCH",
          body: { supplierLastWarnedAt: new Date().toISOString() },
        });
      } catch (err) {
        logger.warn("MissingSupplier", `update timestamp ${o.id} failed: ${err}`);
      }
    }

    logger.info(
      "MissingSupplier",
      `scan done in ${Date.now() - start}ms — ${scanned} orders, ${warned} warnings DMed`,
    );
    return "";
  } catch (err) {
    if (err instanceof PayloadError) {
      logger.error("MissingSupplier", `payload error: ${err.message}`);
    } else {
      logger.error("MissingSupplier", `failed: ${err}`);
    }
    return "";
  }
}
