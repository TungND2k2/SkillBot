/**
 * Tool sinh link công khai (không cần token) để ai đó điền dữ liệu B1
 * và upload file trên web, tạo đơn hàng mới không cần vào Telegram.
 *
 * chatId LUÔN lấy từ system prompt (mục "Người đang chat với bạn ngay
 * lúc này") — AI tự điền, không hỏi lại user.
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { payload, PayloadError } from "../payload/client.js";
import { getConfig } from "../config.js";

function ok(text: string): CallToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(message: string): CallToolResult {
  return { content: [{ type: "text" as const, text: `⚠️ ${message}` }], isError: true };
}

export const createOrderIntakeLink = tool(
  "create_order_intake_link",
  "Sinh 1 link web công khai (không cần đăng nhập/token) để tạo đơn hàng mới (B1). " +
    "Dùng khi user nói kiểu 'tôi cần tạo đơn hàng', 'gửi link tạo đơn', " +
    "đặc biệt khi họ muốn tự điền/upload file (hoá đơn, đề bài) trên web thay vì nhắn từng field qua chat. " +
    "Link tự hết hạn sau khi nộp hoặc sau 7 ngày. Khi có người nộp form, bot sẽ tự nhắn lại vào đúng chat này.",
  {
    chatId: z.number().describe("chatId của cuộc chat hiện tại — lấy từ system prompt, không hỏi user"),
  },
  async ({ chatId }) => {
    try {
      const res = await payload.request<{ doc: { slug: string } }>("/api/order-intake-links", {
        method: "POST",
        body: { requestedByChatId: chatId },
      });
      const url = `${getConfig().PUBLIC_FORM_BASE_URL.replace(/\/$/, "")}/f/${res.doc.slug}`;
      return ok(
        `🔗 Link tạo đơn hàng (không cần đăng nhập, hết hạn sau 7 ngày hoặc khi đã nộp):\n${url}\n\n` +
          `Gửi link này cho người cần tạo đơn. Khi họ điền + nộp xong, tôi sẽ báo lại ngay tại đây.`,
      );
    } catch (e) {
      return err(e instanceof PayloadError ? e.message : String(e));
    }
  },
);
