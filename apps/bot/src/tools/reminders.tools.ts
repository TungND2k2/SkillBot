import { z } from "zod";
import { createCrudTools } from "./factory.js";

/**
 * Reminders — admin/manager tự tạo lịch nhắc qua Telegram chat.
 *
 * Vd user nhắn:
 *   "Nhắc tôi gọi khách Tabuchi 14h thứ 5 tuần sau"
 *   "Đặt lịch họp tuần sáng thứ 2 9h gửi cho manager + planner"
 *   "Lịch deadline đơn PE-001 ngày 15/4"
 *
 * AI suy luận → gọi `create_reminders` với type=standalone hoặc linked.
 */
export const reminderTools = createCrudTools({
  slug: "reminders",
  label: { singular: "lịch nhắc", plural: "lịch nhắc" },
  titleField: "title",
  filterableFields: ["title", "type", "status"],
  inputSchema: {
    title: z.string().describe("Tiêu đề ngắn gọn cho lịch nhắc"),
    type: z
      .enum(["standalone", "linked"])
      .describe("standalone = sự kiện tự do; linked = gắn 1 đơn/khách/vải/NCC"),
    dueAt: z.string().describe("Ngày & giờ ISO: YYYY-MM-DDTHH:mm"),
    notifyMinutesBefore: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Nhắc trước N phút (default 0 = đúng giờ)"),
    description: z.string().optional().describe("Body DM, hỗ trợ {title} {dueAt} {linkRef}"),
    recipients: z
      .array(z.string())
      .optional()
      .describe("Mảng user ID (chuỗi) sẽ nhận DM Telegram"),
    recipientRoles: z
      .array(z.enum(["admin", "manager", "planner", "salesperson", "qc", "storage", "accountant"]))
      .optional()
      .describe("DM tất cả user có role này"),
    status: z.enum(["scheduled", "sent", "cancelled"]).optional(),
  },
});
