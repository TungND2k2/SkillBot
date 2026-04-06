import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import type { WorkflowInstanceDoc } from "../../db/types.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "start_workflow_instance",
  description: "Bắt đầu chạy workflow. Args: template_id, initiated_by?",
  category: "workflows",
  mutating: true,
  inputSchema: {
    template_id: z.string().describe("ID của workflow template"),
    initiated_by: z
      .string()
      .optional()
      .default("system")
      .describe("Người/hệ thống khởi tạo"),
  },
  async handler(args, ctx) {
    const db = getDb();
    const now = nowMs();

    const tmpl = await db
      .collection("workflow_templates")
      .findOne({ _id: new ObjectId(args.template_id as string) });
    if (!tmpl) return err(`Workflow template "${args.template_id}" không tìm thấy`);

    let stages: any[] = [];
    const raw = tmpl.stages;
    if (typeof raw === "string") {
      try {
        stages = JSON.parse(raw);
      } catch {
        stages = [];
      }
    } else {
      stages = (raw as any[]) ?? [];
    }

    const firstStageId = stages.length > 0 ? stages[0].id : null;

    const result = await getDb().collection<WorkflowInstanceDoc>("workflow_instances").insertOne({
      templateId: args.template_id as string,
      tenantId: ctx.tenantId,
      initiatedBy: (args.initiated_by as string) ?? "system",
      currentStageId: firstStageId,
      status: "active",
      formData: {},
      contextData: {},
      channel: null as any,
      history: [{ stage: firstStageId, action: "started", at: now }],
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({ instanceId: String((result.insertedId as any).toHexString()), status: "active", currentStageId: firstStageId });
  },
};
export default skill;

