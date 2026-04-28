/**
 * Custom workflow tools for Orders — go beyond plain CRUD.
 *
 * `advance_order_status` is a strict transition helper: it tells Payload
 * to update `status`, but Payload's `beforeChange` hooks (configured per
 * collection) actually validate role + sequence. AI just sees success/error.
 */
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { payload, PayloadError } from "../payload/client.js";
import { ORDER_STATUSES } from "./orders.tools.js";

export const advanceOrderStatus = tool(
  "advance_order_status",
  `Chuyển 1 đơn hàng sang bước tiếp theo trong workflow B1→B2→B3→B4→B5→B6→done.
Gọi sau khi user xác nhận bước hiện tại đã xong (vd: "đơn EXP-019 đã duyệt định mức, chuyển B3").
Payload sẽ tự kiểm tra quyền + thứ tự bước; nếu sai sẽ trả lỗi.`,
  {
    orderId: z.string().describe("ID đơn hàng"),
    toStatus: z.enum(ORDER_STATUSES).describe("Trạng thái mới"),
    reason: z.string().optional().describe("Lý do/ghi chú khi chuyển bước"),
  },
  async ({ orderId, toStatus, reason }) => {
    try {
      const body: Record<string, unknown> = { status: toStatus };
      if (reason) body.notes = reason;

      const res = await payload.request<{ doc: { id: string; status: string } }>(
        `/api/orders/${encodeURIComponent(String(orderId))}`,
        { method: "PATCH", body },
      );
      return {
        content: [{
          type: "text" as const,
          text: `✅ Đơn ${orderId} → ${res.doc.status}` + (reason ? ` (${reason})` : ""),
        }],
      };
    } catch (e) {
      const msg = e instanceof PayloadError ? e.message : String(e);
      return {
        content: [{ type: "text" as const, text: `⚠️ Không chuyển được: ${msg}` }],
        isError: true,
      };
    }
  },
);
