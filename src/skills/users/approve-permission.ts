import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "approve_permission",
  description: "Duyệt hoặc từ chối yêu cầu quyền (request_id, action)",
  category: "users",
  mutating: true,
  inputSchema: {
    request_id: z.string().describe("ID yêu cầu permission"),
    action: z.enum(["approve", "reject"]).describe("Duyệt hoặc từ chối"),
    granted_access: z
      .string()
      .optional()
      .describe("Quyền cấp (nếu khác với yêu cầu)"),
  },
  async handler(args, ctx) {
    // Only admin/manager can approve
    if (ctx.userRole !== "admin" && ctx.userRole !== "manager") {
      return err("Chỉ admin/manager mới được duyệt quyền");
    }

    const requestId = args.request_id as string;
    const action = args.action as "approve" | "reject";
    const now = nowMs();
    const db = getDb();

    const req = await db
      .collection("permission_requests")
      .findOne({ _id: new ObjectId(requestId) });

    if (!req) return err(`Request "${requestId}" không tìm thấy`);
    if (req.status !== "pending") {
      return err(`Request đã được xử lý (status: ${req.status})`);
    }

    const status = action === "approve" ? "approved" : "rejected";
    const grantedAccess =
      action === "approve"
        ? (args.granted_access as string) ?? req.requestedAccess
        : null;

    await db.collection("permission_requests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status, grantedAccess, resolvedAt: now } },
    );

    return ok({
      resolved: true,
      requestId,
      status,
      requester: req.requesterName,
      resource: req.resource,
      grantedAccess,
      __notify_user__: {
        userId: req.requesterId,
        message:
          action === "approve"
            ? `Yêu cầu quyền <b>${req.resource}</b> đã được <b>duyệt</b> bởi ${ctx.userName}. Quyền: ${grantedAccess}`
            : `Yêu cầu quyền <b>${req.resource}</b> đã bị <b>từ chối</b> bởi ${ctx.userName}.`,
      },
    });
  },
};
export default skill;
