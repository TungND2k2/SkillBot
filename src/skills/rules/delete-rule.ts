import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "delete_rule",
  description: "Xoá / disable business rule (soft delete → status=disabled)",
  category: "rules",
  mutating: true,
  inputSchema: {
    rule_id: z.string().describe("ID của business rule cần xoá"),
  },
  async handler(args, ctx) {
    const now = nowMs();
    const db = getDb();

    const existing = await db
      .collection("business_rules")
      .findOne({ _id: new ObjectId(args.rule_id as string), tenantId: ctx.tenantId });
    if (!existing)
      return err(`Rule "${args.rule_id}" không tìm thấy`);

    await db.collection("business_rules").updateOne(
      { _id: new ObjectId(args.rule_id as string) },
      { $set: { status: "disabled", updatedAt: now } },
    );

    return ok({ deleted: true, ruleId: args.rule_id, name: existing.name });
  },
};
export default skill;
