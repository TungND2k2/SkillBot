/**
 * Custom tool: tóm tắt trạng thái 1 đơn cụ thể với thông tin workflow.
 * Trả về: bước hiện tại, bước này được bao nhiêu ngày, hạn dự kiến,
 * còn lại bao nhiêu ngày tới deadline khách, các reminder đã/chưa gửi.
 *
 * Cho user hỏi "đơn PE5 đang sao rồi" — AI gọi tool này thay vì đọc raw.
 */
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { payload, PayloadError } from "../payload/client.js";
import { getStage } from "../cron/stages.js";

interface OrderRow {
  id: string;
  orderCode: string;
  status: string;
  customer?: { name?: string } | string;
  totalAmount?: number;
  deposit?: number;
  owedAmount?: number;
  expectedDeliveryDate?: string;
  stageStartedAt?: string;
  remindersSent?: Array<{ stageCode: string; atDay: number; kind: string; sentAt: string }>;
}

function days(fromIso: string, to = new Date()): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function customerName(c: OrderRow["customer"]): string {
  if (!c) return "—";
  if (typeof c === "string") return c;
  return c.name ?? "—";
}

export const orderStatusSummary = tool(
  "order_status_summary",
  `Tóm tắt trạng thái 1 đơn cụ thể: bước hiện tại, đã ở bước này bao
nhiêu ngày, hạn dự kiến, còn lại bao nhiêu ngày tới deadline khách,
reminder đã gửi.

Dùng khi user hỏi "đơn X đang sao rồi", "PE5 còn lại mấy ngày", v.v.`,
  {
    orderCode: z.string().optional().describe("Mã đơn (PE5, PE100). Ưu tiên hơn id nếu có."),
    id: z.string().optional().describe("ID đơn (nếu không có orderCode)"),
  },
  async ({ orderCode, id }) => {
    if (!orderCode && !id) {
      return {
        content: [{ type: "text" as const, text: "⚠️ Cần truyền orderCode hoặc id" }],
        isError: true,
      };
    }

    try {
      let order: OrderRow | null = null;

      if (orderCode) {
        const res = await payload.request<{ docs: OrderRow[] }>("/api/orders", {
          query: { where: { orderCode: { equals: orderCode } }, limit: 1 },
        });
        order = res.docs[0] ?? null;
      } else if (id) {
        order = await payload.request<OrderRow>(`/api/orders/${id}`);
      }

      if (!order) {
        return {
          content: [{ type: "text" as const, text: `❌ Không tìm thấy đơn ${orderCode ?? id}` }],
          isError: true,
        };
      }

      // Stage config — đọc từ hard-coded constant, không query DB
      const stage = getStage(order.status);

      const lines = [`📦 Đơn ${order.orderCode} — ${customerName(order.customer)}`];
      lines.push(`Trạng thái: ${order.status.toUpperCase()}${stage ? " — " + stage.name : ""}`);

      if (order.stageStartedAt && stage) {
        const elapsed = days(order.stageStartedAt);
        const dur = stage.durationDays ?? 0;
        const remaining = dur > 0 ? dur - elapsed : 0;
        lines.push(
          `Đã ở bước ${stage.code.toUpperCase()}: ${elapsed} ngày` +
            (dur > 0
              ? remaining >= 0
                ? ` (còn ${remaining} ngày dự kiến)`
                : ` (TRỄ ${-remaining} ngày)`
              : ""),
        );
        if (stage.responsibleRole) {
          lines.push(`Phụ trách: ${stage.responsibleRole}`);
        }
      }

      if (order.expectedDeliveryDate) {
        const dDays = days(new Date().toISOString(), new Date(order.expectedDeliveryDate));
        lines.push(
          `Deadline khách: ${order.expectedDeliveryDate.slice(0, 10)} (${
            dDays >= 0 ? `còn ${dDays} ngày` : `TRỄ ${-dDays} ngày`
          })`,
        );
      }

      if (order.totalAmount !== undefined) {
        lines.push(
          `Tài chính: tổng ${order.totalAmount.toLocaleString("vi-VN")}đ, ` +
            `cọc ${(order.deposit ?? 0).toLocaleString("vi-VN")}đ, ` +
            `nợ ${(order.owedAmount ?? 0).toLocaleString("vi-VN")}đ`,
        );
      }

      if (order.remindersSent && order.remindersSent.length > 0) {
        lines.push(`Nhắc đã gửi: ${order.remindersSent.map((r) => `${r.stageCode}/d${r.atDay}/${r.kind}`).join(", ")}`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      const msg = err instanceof PayloadError ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `⚠️ ${msg}` }],
        isError: true,
      };
    }
  },
);
