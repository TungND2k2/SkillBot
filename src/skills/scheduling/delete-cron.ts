import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "delete_cron",
  description: "Xoá cron job. Args: cron_id",
  category: "scheduling",
  mutating: true,
  inputSchema: {
    cron_id: z.string().describe("ID cron job cần xoá"),
  },
  async handler(args, ctx) {
    const cronId = args.cron_id as string;
    const db = getDb();

    const existing = await db
      .collection("cron_jobs")
      .findOne({ _id: new ObjectId(cronId), tenantId: ctx.tenantId });
    if (!existing) {
      return err(`Cron "${cronId}" không tìm thấy`);
    }

    await db.collection("cron_jobs").deleteOne({ _id: new ObjectId(cronId) });

    return ok({ deleted: true, cron_id: cronId });
  },
};
export default skill;
