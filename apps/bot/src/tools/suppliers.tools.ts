import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const supplierTools = createCrudTools({
  slug: "suppliers",
  label: { singular: "nhà cung cấp", plural: "nhà cung cấp" },
  titleField: "name",
  filterableFields: ["code", "name", "category"],
  inputSchema: {
    code: z.string().describe("Mã NCC (vd: NCC-001)"),
    name: z.string().describe("Tên NCC"),
    category: z.enum(["fabric", "thread", "accessory", "packaging", "other"])
      .describe("Loại hàng cung cấp"),
    phone: z.string().optional(),
    address: z.string().optional(),
    rating: z.enum(["1", "2", "3", "4", "5"]).optional().describe("Đánh giá 1-5 sao"),
    notes: z.string().optional(),
  },
});
