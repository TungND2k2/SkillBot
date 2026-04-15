import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "delete_workflow",
  description: "Xóa (soft-delete) workflow template. Dùng list_workflows để lấy workflow_id. Chỉ admin/manager.",
  category: "workflows",
  mutating: true,
  requiredRoles: ["admin", "manager"],
  inputSchema: {
    workflow_id: z.string().optional().describe("ID workflow template (ưu tiên hơn workflow_name)"),
    workflow_name: z.string().optional().describe("Tên workflow để tìm (fuzzy match)"),
  },
  async handler(args, ctx) {
    const db = getDb();

    let workflowId = args.workflow_id as string | undefined;
    let workflowName = "";
    if (!workflowId && args.workflow_name) {
      const all = await db.collection("workflow_templates").find({ tenantId: ctx.tenantId, status: "active" }).toArray();
      const match = all.find((w: any) =>
        w.name.toLowerCase().includes((args.workflow_name as string).toLowerCase()),
      );
      if (!match) return err(`Workflow "${args.workflow_name}" không tìm thấy. Dùng list_workflows để xem danh sách.`);
      workflowId = String((match as any)._id);
      workflowName = match.name as string;
    }
    if (!workflowId) return err("Cần cung cấp workflow_id hoặc workflow_name.");

    const existing = await db.collection("workflow_templates").findOne({
      _id: new ObjectId(workflowId),
      tenantId: ctx.tenantId,
    });
    if (!existing) return err(`Workflow ID "${workflowId}" không tồn tại.`);
    if (existing.status === "deleted") return err("Workflow này đã bị xóa trước đó.");

    await db.collection("workflow_templates").updateOne(
      { _id: new ObjectId(workflowId) },
      { $set: { status: "deleted", updatedAt: nowMs() } },
    );

    return ok({
      deleted: true,
      id: workflowId,
      name: workflowName || existing.name,
    });
  },
};
export default skill;
