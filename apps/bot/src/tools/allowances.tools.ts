import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const allowanceTools = createCrudTools({
  slug: "allowances",
  label: { singular: "định mức vải", plural: "định mức vải" },
  filterableFields: ["status"],
  inputSchema: {
    order: z.string().describe("ID đơn hàng"),
    fabric: z.string().describe("ID mã vải"),
    technicalQty: z.number().positive().describe("Định mức kỹ thuật, mét/sp (do KT tính)"),
    wastagePercent: z.number().min(0).max(50).default(8)
      .describe("% hao phí (mặc định 8%)"),
    status: z.enum(["draft", "pending", "approved", "rejected"]).default("draft"),
    notes: z.string().optional(),
  },
  // approvedQty và totalNeeded tự tính ở hook Payload — AI không truyền.
});
