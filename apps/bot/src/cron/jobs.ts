/**
 * Pre-defined cron jobs cho cơ sở may thêu, theo guide:
 *  - T2 9h: tổng hợp lịch mua vải tuần
 *  - T6 17h: báo cáo tuần
 *  - Mỗi giờ: cảnh báo tồn kho thấp
 *  - Mỗi giờ: scan order overdue → DM Telegram theo workflow.reminders
 */
import type { CronJob } from "./worker.js";
import { payload, PayloadError } from "../payload/client.js";
import type { PayloadFindResponse } from "../payload/types.js";
import type { TelegramChannel } from "../telegram/channel.js";
import { runOrderReminders } from "./order-reminders.js";
import { runCalendarReminders } from "./calendar-reminders.js";
import { runMissingSupplierWarnings } from "./missing-suppliers.js";

interface InventoryRow {
  id: string;
  fabric: string | { code: string; name: string; color: string };
  quantityM: number;
  minLevel: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface OrderStatusRow {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const fabricLabel = (f: InventoryRow["fabric"]): string =>
  typeof f === "string" ? f : `${f.code} ${f.name}`;

export interface BuildCronJobsOptions {
  /** Cần để job order-reminders gửi DM trực tiếp tới user. */
  telegram?: TelegramChannel;
  /** Fallback chat khi user không có telegramUserId. */
  adminChatId?: number;
}

export function buildCronJobs(opts: BuildCronJobsOptions = {}): CronJob[] {
  const jobs: CronJob[] = [
    {
      name: "weekly-purchase-monday",
      schedule: "0 9 * * 1", // Thứ Hai 9h
      async run() {
        try {
          const res = await payload.request<PayloadFindResponse<InventoryRow>>("/api/inventory", {
            query: {
              where: { status: { in: ["low", "critical", "empty"] } },
              depth: 1,
              limit: 50,
            },
          });
          if (res.totalDocs === 0) return "🟢 Sáng thứ Hai — toàn bộ vải đủ tồn, không cần đặt mới tuần này.";

          const lines = res.docs.map((r) => {
            const need = Math.max(0, r.minLevel - r.quantityM);
            return `• ${fabricLabel(r.fabric)} — tồn ${r.quantityM}m, cần đặt ≥ ${need}m`;
          });
          return [
            "🛒 *Lịch mua vải tuần này*",
            "",
            ...lines,
            "",
            `Tổng ${res.totalDocs} mã cần đặt. Vui lòng duyệt rồi gọi đặt NCC.`,
          ].join("\n");
        } catch (e) {
          return `⚠️ Không tổng hợp được lịch mua vải: ${e instanceof PayloadError ? e.message : e}`;
        }
      },
    },

    {
      name: "weekly-report-friday",
      schedule: "0 17 * * 5", // Thứ Sáu 17h
      async run() {
        try {
          const [orders, inv] = await Promise.all([
            payload.request<PayloadFindResponse<OrderStatusRow>>("/api/orders", { query: { limit: 0 } }),
            payload.request<PayloadFindResponse<InventoryRow>>("/api/inventory", {
              query: { where: { status: { in: ["low", "critical", "empty"] } }, limit: 0 },
            }),
          ]);

          const byStatus: Record<string, number> = {};
          for (const o of orders.docs) {
            byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
          }

          return [
            "📊 *Báo cáo cuối tuần*",
            "",
            `📦 Đơn hàng: ${orders.totalDocs}`,
            ...Object.entries(byStatus).map(([s, n]) => `  • ${s.toUpperCase()}: ${n}`),
            "",
            `📦 Vải tồn cảnh báo: ${inv.totalDocs} mã`,
          ].join("\n");
        } catch (e) {
          return `⚠️ Không sinh được báo cáo: ${e instanceof PayloadError ? e.message : e}`;
        }
      },
    },

    {
      name: "hourly-low-stock-watch",
      schedule: "0 * * * *", // mỗi giờ
      async run() {
        try {
          const res = await payload.request<PayloadFindResponse<InventoryRow>>("/api/inventory", {
            query: { where: { status: { equals: "critical" } }, depth: 1, limit: 10 },
          });
          // Chỉ thông báo khi có hàng critical mới — để tránh spam ta giới hạn 1 thông báo/giờ.
          if (res.totalDocs === 0) return "";

          return [
            "🚨 *Cảnh báo tồn kho rất thấp*",
            "",
            ...res.docs.map((r) => `• ${fabricLabel(r.fabric)} — chỉ còn ${r.quantityM}m`),
          ].join("\n");
        } catch {
          return "";
        }
      },
    },
  ];

  // Job DM theo workflow reminders — chỉ chạy khi có TelegramChannel
  // (không thì DM = no-op).
  if (opts.telegram) {
    const tg = opts.telegram;
    const adminChat = opts.adminChatId;
    jobs.push({
      name: "hourly-order-reminders",
      schedule: "5 * * * *", // mỗi giờ phút thứ 5 (lệch low-stock 5 phút)
      run: () => runOrderReminders({ telegram: tg, adminChatId: adminChat }),
    });
    jobs.push({
      name: "calendar-reminders",
      schedule: "*/5 * * * *", // mỗi 5 phút — calendar event granularity
      run: () => runCalendarReminders({ telegram: tg, adminChatId: adminChat }),
    });
    jobs.push({
      name: "missing-supplier-warnings",
      schedule: "25 * * * *", // mỗi giờ phút thứ 25 (lệch các cron khác)
      run: () =>
        runMissingSupplierWarnings({ telegram: tg, adminChatId: adminChat }),
    });
  }

  return jobs;
}
