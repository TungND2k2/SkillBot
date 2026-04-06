import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { newId } from "../../utils/id.js";

const skill: SkillDef = {
  name: "save_knowledge",
  description: "Lưu kiến thức cho bot (append hoặc replace). Args: content, title?, mode?",
  category: "knowledge",
  mutating: true,
  inputSchema: {
    content: z.string().describe("Nội dung kiến thức cần lưu"),
    title: z.string().optional().describe("Tiêu đề"),
    mode: z
      .enum(["append", "replace"])
      .optional()
      .default("append")
      .describe("Ghi đè hoặc nối thêm"),
  },
  async handler(args, ctx) {
    const db = getDb();
    const title = (args.title as string) ?? "Knowledge";
    const content = `## ${title}\n${args.content as string}`;
    const mode = (args.mode as string) ?? "append";

    const existing = await db
      .collection("bot_docs")
      .findOne({ tenantId: ctx.tenantId });

    if (existing) {
      const newContent =
        mode === "replace"
          ? (args.content as string)
          : (existing.content ?? "") + "\n\n" + content;

      await db.collection("bot_docs").updateOne(
        { tenantId: ctx.tenantId },
        {
          $set: {
            content: newContent,
            createdBy: ctx.userId ?? "",
            createdByName: ctx.userName ?? "",
            createdAt: Date.now(),
          },
        },
      );
      return ok({ updated: true, mode, title });
    } else {
      const id = newId();
      await db.collection("bot_docs").insertOne({
        id,
        tenantId: ctx.tenantId,
        title: "Bot Knowledge",
        content,
        createdBy: ctx.userId ?? "",
        createdByName: ctx.userName ?? "",
        createdAt: Date.now(),
      });
      return ok({ id, created: true, title });
    }
  },
};
export default skill;

