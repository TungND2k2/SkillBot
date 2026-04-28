/**
 * Aggregate / report tools — non-CRUD queries that combine multiple
 * collections or apply business filters that aren't expressible
 * cleanly through factory's filterableFields.
 */
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { payload, PayloadError } from "../payload/client.js";
import type { PayloadFindResponse } from "../payload/types.js";

interface InventoryRow {
  id: string;
  fabric: string | { id: string; code: string; name: string; color: string };
  quantityM: number;
  minLevel: number;
  status: "ok" | "low" | "critical" | "empty";
  lastReceivedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface QcLogRow {
  id: string;
  passRate: number;
  conclusion: string;
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

const STATUS_LABELS: Record<string, string> = {
  ok: "✅ Đủ",
  low: "⚠️ Sắp hết",
  critical: "🚨 Cảnh báo",
  empty: "❌ Hết hàng",
};

function fabricLabel(f: InventoryRow["fabric"]): string {
  if (typeof f === "string") return f;
  return `${f.code} — ${f.name} (${f.color})`;
}

export const findLowStock = tool(
  "find_low_stock",
  `Tìm các vải đang ở mức tồn thấp (low/critical/empty). Dùng khi user hỏi
"có vải nào sắp hết?", "tồn kho có gì cần đặt?", "cảnh báo tồn kho".`,
  {},
  async () => {
    try {
      const res = await payload.request<PayloadFindResponse<InventoryRow>>("/api/inventory", {
        query: {
          where: { status: { in: ["low", "critical", "empty"] } },
          depth: 1, // populate fabric relation
          limit: 50,
        },
      });

      if (res.totalDocs === 0) {
        return { content: [{ type: "text" as const, text: "✅ Tất cả vải đều đủ tồn." }] };
      }

      const lines = res.docs.map((row) => {
        const need = Math.max(0, row.minLevel - row.quantityM);
        return `${STATUS_LABELS[row.status] ?? row.status} ${fabricLabel(row.fabric)} — tồn ${row.quantityM}m / min ${row.minLevel}m${need > 0 ? ` (cần đặt ≥ ${need}m)` : ""}`;
      });

      return {
        content: [{
          type: "text" as const,
          text: `Có ${res.totalDocs} mã vải cần chú ý:\n${lines.join("\n")}`,
        }],
      };
    } catch (e) {
      const msg = e instanceof PayloadError ? e.message : String(e);
      return {
        content: [{ type: "text" as const, text: `⚠️ Không tra cứu được: ${msg}` }],
        isError: true,
      };
    }
  },
);

export const weeklyReport = tool(
  "weekly_report",
  `Sinh báo cáo tuần: tổng đơn đang chạy theo bước, tồn kho cảnh báo,
QC pass rate trung bình. Dùng khi user nói "báo cáo tuần", "report",
hoặc cron Friday gọi.`,
  {},
  async () => {
    try {
      const [orders, inventory, qcLogs] = await Promise.all([
        payload.request<PayloadFindResponse<OrderStatusRow>>("/api/orders", { query: { limit: 0 } }),
        payload.request<PayloadFindResponse<InventoryRow>>("/api/inventory", {
          query: { where: { status: { in: ["low", "critical", "empty"] } }, depth: 1, limit: 0 },
        }),
        payload.request<PayloadFindResponse<QcLogRow>>(
          "/api/qc-logs",
          { query: { limit: 100, sort: "-createdAt" } },
        ),
      ]);

      const byStatus: Record<string, number> = {};
      for (const o of orders.docs) {
        byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      }

      const passRates = qcLogs.docs.map((q) => q.passRate).filter((n) => typeof n === "number");
      const avgPass = passRates.length === 0 ? null
        : passRates.reduce((a, b) => a + b, 0) / passRates.length;

      const lines = [
        "📊 *Báo cáo tuần*",
        "",
        `📦 Tổng đơn: ${orders.totalDocs}`,
        ...Object.entries(byStatus).map(([s, n]) => `  • ${s.toUpperCase()}: ${n}`),
        "",
        `📦 Tồn kho cảnh báo: ${inventory.totalDocs} mã`,
        ...inventory.docs.slice(0, 5).map((r) =>
          `  • ${fabricLabel(r.fabric)} — ${r.quantityM}m`,
        ),
        "",
        avgPass !== null
          ? `🔍 QC pass rate (${qcLogs.docs.length} lô gần nhất): ${avgPass.toFixed(1)}%`
          : "🔍 QC chưa có log nào",
      ];

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e) {
      const msg = e instanceof PayloadError ? e.message : String(e);
      return {
        content: [{ type: "text" as const, text: `⚠️ Lỗi sinh báo cáo: ${msg}` }],
        isError: true,
      };
    }
  },
);
