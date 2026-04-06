import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "update_instructions",
  description:
    "Cập nhật hướng dẫn bot (content, mode: append|replace). Dùng khi học được pattern mới hoặc user dạy quy trình",
  category: "admin",
  mutating: true,
  inputSchema: {
    content: z.string().describe("Nội dung instructions"),
    mode: z
      .enum(["append", "replace"])
      .optional()
      .default("append")
      .describe("Ghi đè hoặc nối thêm"),
  },
  async handler(args, ctx) {
    const content = args.content as string;
    const mode = (args.mode as string) ?? "append";

    if (!content) return err("content is required");

    const db = getDb();
    const tenant = await db
      .collection("tenants")
      .findOne({ _id: new ObjectId(ctx.tenantId) });
    if (!tenant) return err("Tenant not found");

    let newInstructions: string;
    if (mode === "replace") {
      newInstructions = content;
    } else {
      newInstructions = tenant.instructions
        ? `${tenant.instructions}\n\n${content}`
        : content;
    }

    await db.collection("tenants").updateOne(
      { _id: new ObjectId(ctx.tenantId) },
      { $set: { instructions: newInstructions, updatedAt: nowMs() } },
    );

    return ok({ success: true, mode, length: newInstructions.length });
  },
};
export default skill;
