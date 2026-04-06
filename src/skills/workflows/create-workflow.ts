import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "create_workflow",
  description:
    "Tạo quy trình mới. Args: name, description?, domain?, stages[{id,name,type}]",
  category: "workflows",
  mutating: true,
  inputSchema: {
    name: z.string().describe("Tên workflow"),
    description: z.string().optional().describe("Mô tả workflow"),
    domain: z.string().optional().describe("Domain / phân loại"),
    stages: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          type: z
            .enum([
              "form",
              "validation",
              "approval",
              "action",
              "notification",
              "conditional",
            ])
            .optional()
            .default("form"),
          description: z.string().optional(),
          form_id: z.string().optional(),
          rules_id: z.string().optional(),
          approval_config: z.record(z.unknown()).optional(),
          action_config: z.record(z.unknown()).optional(),
          notification_config: z.record(z.unknown()).optional(),
          conditional_config: z.record(z.unknown()).optional(),
          next_stage_id: z.string().optional(),
          timeout_ms: z.number().optional(),
        }),
      )
      .optional()
      .default([])
      .describe("Danh sách stages của workflow"),
  },
  async handler(args, ctx) {
    const now = nowMs();

    const stagesInput = (args.stages as any[]) ?? [];
    const stages = stagesInput.map((s: any, i: number) => ({
      ...s,
      id: s.id ?? `step_${i + 1}`,
      name: s.name,
      type: s.type ?? "form",
      next_stage_id:
        s.next_stage_id ??
        (i < stagesInput.length - 1
          ? stagesInput[i + 1]?.id ?? `step_${i + 2}`
          : undefined),
    }));

    const result = await getDb().collection("workflow_templates").insertOne({
      tenantId: ctx.tenantId,
      name: args.name as string,
      description: (args.description as string) ?? null,
      domain: (args.domain as string) ?? null,
      version: 1,
      stages: JSON.stringify(stages),
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({ id: result.insertedId.toHexString(), name: args.name, stageCount: stages.length });
  },
};
export default skill;

