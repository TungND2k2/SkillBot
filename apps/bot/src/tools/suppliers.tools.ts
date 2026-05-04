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
    category: z
      .enum([
        "fabric",
        "thread",
        "embroidery_service",
        "fabric_printing",
        "accessory",
        "logistics",
        "packaging",
        "other",
      ])
      .describe(
        "Loại NCC: fabric=vải, thread=chỉ, embroidery_service=xưởng thêu, fabric_printing=in vải, accessory=phụ kiện, logistics=vận chuyển, packaging=bao bì",
      ),
    specialty: z.string().optional().describe("Chuyên về (vd: 'cotton organic', 'in thăng hoa', 'tuyến HCM-HN')"),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    taxCode: z.string().optional(),
    bankAccount: z.string().optional(),
    rating: z.enum(["1", "2", "3", "4", "5"]).optional().describe("Đánh giá 1-5 sao"),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
  },
});
