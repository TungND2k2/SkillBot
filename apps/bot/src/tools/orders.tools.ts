import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const ORDER_STATUSES = [
  "b1", "b2", "b3", "b4", "b5", "b6",
  "done", "paused", "cancelled",
] as const;

/**
 * Orders CRUD — phản chiếu spec B1 (15 trường).
 * Mã đơn (`orderCode`) tự sinh ở Payload hook nên KHÔNG truyền khi create.
 * `owedAmount` cũng tự tính từ totalAmount - deposit.
 */
export const orderTools = createCrudTools({
  slug: "orders",
  label: { singular: "đơn hàng", plural: "đơn hàng" },
  titleField: "orderCode",
  filterableFields: ["status", "orderCode", "country"],
  inputSchema: {
    // 1. Ngày đặt
    orderDate: z.string().optional().describe("Ngày đặt YYYY-MM-DD (bỏ trống = hôm nay)"),

    // 3. Composite Mã DA
    brandCode: z.string().default("PE").describe("Mã thương hiệu (PE, VN...)"),
    country: z.string().describe("Quốc gia khách"),
    salesperson: z.string().optional().describe("ID user role salesperson"),
    salespersonCode: z.string().optional().describe("Mã sales viết tắt (vd: MAINT)"),

    // 4. Customer relationship
    customer: z.string().describe("ID customer (lấy từ list_customers nếu chưa biết)"),

    // 5-6. Files (ID media)
    invoiceFile: z.string().optional().describe("ID media của hóa đơn"),
    briefFile: z.string().optional().describe("ID media của đề bài"),

    // 7-8
    totalAmount: z.number().nonnegative().describe("Tổng giá trị đơn (đ)"),
    deposit: z.number().nonnegative().default(0).describe("Đặt cọc (đ)"),

    // 12-13
    shippingFee: z.number().nonnegative().default(0).describe("Phí ship (đ)"),
    expectedWeightKg: z.number().nonnegative().optional().describe("Trọng lượng dự kiến (kg)"),

    // 14
    expectedDeliveryDate: z.string().describe("Hạn giao YYYY-MM-DD"),

    // 15
    customerConfirmationImage: z.string().optional().describe("ID media của ảnh khách xác nhận"),

    // Status
    status: z.enum(ORDER_STATUSES).default("b1"),

    notes: z.string().optional(),
  },
});
