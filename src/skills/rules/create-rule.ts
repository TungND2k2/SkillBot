import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "create_rule",
  description:
    "Tạo business rule. Args: name, rule_type, conditions, actions, description?, domain?, priority?",
  category: "rules",
  mutating: true,
  inputSchema: {
    name: z.string().describe("Tên rule"),
    description: z.string().optional().describe("Mô tả rule"),
    domain: z.string().optional().describe("Domain / phân loại"),
    rule_type: z
      .string()
      .optional()
      .default("validation")
      .describe("Loại rule: validation, automation, notification, escalation"),
    conditions: z
      .record(z.unknown())
      .optional()
      .default({})
      .describe("Điều kiện rule (JSON object)"),
    actions: z
      .array(z.record(z.unknown()))
      .optional()
      .default([])
      .describe("Actions khi rule match"),
    priority: z
      .number()
      .optional()
      .default(0)
      .describe("Độ ưu tiên (số lớn = ưu tiên cao)"),
  },
  async handler(args, ctx) {
    const now = nowMs();

    const result = await getDb().collection("business_rules").insertOne({
      tenantId: ctx.tenantId,
      name: args.name as string,
      description: (args.description as string) ?? null,
      domain: (args.domain as string) ?? null,
      ruleType: (args.rule_type as string) ?? "validation",
      conditions: JSON.stringify(args.conditions ?? {}),
      actions: JSON.stringify(args.actions ?? []),
      priority: (args.priority as number) ?? 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({ id: result.insertedId.toHexString(), name: args.name });
  },
};
export default skill;

