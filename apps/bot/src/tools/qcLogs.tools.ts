import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const qcLogTools = createCrudTools({
  slug: "qc-logs",
  label: { singular: "QC log", plural: "QC log" },
  titleField: "batch",
  filterableFields: ["batch", "conclusion"],
  inputSchema: {
    order: z.string().describe("ID đơn hàng được kiểm"),
    batch: z.string().describe("Tên/số lô (vd: Lô 1)"),
    inspectedQty: z.number().int().positive().describe("Số sản phẩm đã kiểm"),
    defectCount: z.number().int().nonnegative().default(0).describe("Số lỗi phát hiện"),
    defectTypes: z.array(z.enum([
      "thread-line", "thread-color", "seam", "embroidery", "appearance",
    ])).optional().describe("Các loại lỗi"),
    notes: z.string().optional().describe("Mô tả lỗi cụ thể"),
    inspector: z.string().optional().describe("ID người kiểm"),
  },
  // Pass rate + conclusion tự tính ở Payload hook → AI không cần truyền.
  exclude: ["delete"],
});
