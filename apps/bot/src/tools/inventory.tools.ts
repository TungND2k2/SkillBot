import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const inventoryTools = createCrudTools({
  slug: "inventory",
  label: { singular: "tồn kho", plural: "tồn kho" },
  titleField: "id",
  filterableFields: ["status"],
  inputSchema: {
    fabric: z.string().describe("ID mã vải (lấy từ list_fabrics nếu chưa biết)"),
    quantityM: z.number().nonnegative().describe("Số mét đang tồn"),
    minLevel: z.number().nonnegative().default(50).describe("Mức tối thiểu — dưới mức này AI sẽ cảnh báo"),
    lastReceivedAt: z.string().optional().describe("Ngày nhập gần nhất YYYY-MM-DD"),
    notes: z.string().optional(),
  },
  exclude: ["delete"], // không cho xoá row tồn kho
});
