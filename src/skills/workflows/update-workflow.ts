import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "update_workflow",
  description:
    "Cập nhật workflow template: đổi tên, mô tả, domain, hoặc thay toàn bộ stages. Dùng list_workflows để lấy workflow_id. Chỉ admin/manager.",
  category: "workflows",
  mutating: true,
  requiredRoles: ["admin", "manager"],
  inputSchema: {
    workflow_id: z.string().optional().describe("ID workflow template (ưu tiên hơn workflow_name)"),
    workflow_name: z.string().optional().describe("Tên workflow để tìm (fuzzy match)"),
    name: z.string().optional().describe("Tên mới"),
    description: z.string().optional().describe("Mô tả mới"),
    domain: z.string().optional().describe("Domain mới"),
    stages: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          type: z
            .enum(["form", "validation", "approval", "action", "notification", "conditional"])
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
      .describe("Toàn bộ stages mới (thay thế hoàn toàn). Bỏ trống = không đổi stages."),
  },
  async handler(args, ctx) {
    const db = getDb();
    const now = nowMs();

    let workflowId = args.workflow_id as string | undefined;
    if (!workflowId && args.workflow_name) {
      const all = await db.collection("workflow_templates").find({ tenantId: ctx.tenantId, status: "active" }).toArray();
      const match = all.find((w: any) =>
        w.name.toLowerCase().includes((args.workflow_name as string).toLowerCase()),
      );
      if (!match) return err(`Workflow "${args.workflow_name}" không tìm thấy. Dùng list_workflows để xem danh sách.`);
      workflowId = String((match as any)._id);
    }
    if (!workflowId) return err("Cần cung cấp workflow_id hoặc workflow_name.");

    const existing = await db.collection("workflow_templates").findOne({
      _id: new ObjectId(workflowId),
      tenantId: ctx.tenantId,
    });
    if (!existing) return err(`Workflow ID "${workflowId}" không tồn tại.`);

    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.name) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.domain !== undefined) updates.domain = args.domain;

    if (args.stages) {
      const stagesInput = args.stages as any[];
      const stages = stagesInput.map((s: any, i: number) => ({
        ...s,
        id: s.id ?? `step_${i + 1}`,
        type: s.type ?? "form",
        next_stage_id:
          s.next_stage_id ??
          (i < stagesInput.length - 1 ? stagesInput[i + 1]?.id ?? `step_${i + 2}` : undefined),
      }));
      updates.stages = JSON.stringify(stages);
      updates.version = (existing.version as number ?? 1) + 1;
    }

    await db.collection("workflow_templates").updateOne(
      { _id: new ObjectId(workflowId) },
      { $set: updates },
    );

    const updated = await db.collection("workflow_templates").findOne({ _id: new ObjectId(workflowId) });
    const stages =
      typeof updated!.stages === "string" ? JSON.parse(updated!.stages as string) : updated!.stages;

    return ok({
      updated: true,
      id: workflowId,
      name: updated!.name,
      version: updated!.version,
      stageCount: Array.isArray(stages) ? stages.length : 0,
    });
  },
};
export default skill;
