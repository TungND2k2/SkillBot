import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "approve_workflow",
  description:
    "Approve hoặc reject một workflow approval. Args: approval_id, decision, reason?",
  category: "workflows",
  mutating: true,
  inputSchema: {
    approval_id: z.string().describe("ID của approval request"),
    decision: z
      .enum(["approved", "rejected"])
      .describe("Quyết định: approved hoặc rejected"),
    reason: z.string().optional().describe("Lý do quyết định"),
  },
  async handler(args, ctx) {
    const now = nowMs();
    const db = getDb();

    const existing = await db
      .collection("workflow_approvals")
      .findOne({ _id: new ObjectId(args.approval_id as string) });
    if (!existing) return err(`Approval "${args.approval_id}" không tìm thấy`);
    if (existing.status !== "pending")
      return err(`Approval đã được xử lý (status: ${existing.status})`);

    await db.collection("workflow_approvals").updateOne(
      { _id: new ObjectId(args.approval_id as string) },
      {
        $set: {
          status: args.decision as string,
          decisionReason: (args.reason as string) ?? null,
          decidedAt: now,
        },
      },
    );

    return ok({
      updated: true,
      approvalId: args.approval_id,
      status: args.decision,
    });
  },
};
export default skill;
