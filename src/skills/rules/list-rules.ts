import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_rules",
  description: "Xem danh sách business rules đang active",
  category: "rules",
  mutating: false,
  inputSchema: {
    domain: z
      .string()
      .optional()
      .describe("Lọc theo domain (nếu có)"),
    rule_type: z
      .string()
      .optional()
      .describe("Lọc theo loại rule: validation, automation, notification..."),
  },
  async handler(args, ctx) {
    const rows = await getDb()
      .collection("business_rules")
      .find({ tenantId: ctx.tenantId, status: "active" })
      .toArray();

    let filtered = (rows as any[]).map(r => ({ id: String(r._id), name: r.name, description: r.description, domain: r.domain, ruleType: r.ruleType, priority: r.priority, status: r.status }));
    if (args.domain) {
      filtered = filtered.filter((r) => r.domain === (args.domain as string));
    }
    if (args.rule_type) {
      filtered = filtered.filter((r) => r.ruleType === (args.rule_type as string));
    }

    return ok(filtered);
  },
};
export default skill;
