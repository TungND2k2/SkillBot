import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const fabricTools = createCrudTools({
  slug: "fabrics",
  label: { singular: "mã vải", plural: "mã vải" },
  titleField: "code",
  filterableFields: ["code", "color", "name"],
  inputSchema: {
    code: z.string().describe("Mã vải (vd: VL-001)"),
    name: z.string().describe("Tên vải"),
    color: z.string().describe("Màu vải"),
    material: z.enum(["cotton", "linen", "linen-blend", "taffeta", "polyester", "other"])
      .optional().describe("Chất liệu"),
    widthCm: z.number().positive().optional().describe("Khổ vải (cm)"),
    pricePerMeter: z.number().nonnegative().optional().describe("Giá mỗi mét (đồng)"),
    notes: z.string().optional(),
  },
  exclude: ["delete"], // mã vải không cho LLM xoá
});
