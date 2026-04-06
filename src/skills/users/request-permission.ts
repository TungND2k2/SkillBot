import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "request_permission",
  description: "Xin quyền truy cập (resource, access?, reason?)",
  category: "users",
  mutating: true,
  inputSchema: {
    resource: z.string().describe("Tên resource cần quyền truy cập"),
    access: z.string().optional().default("CRU").describe("Loại quyền (C/R/U/D)"),
    reason: z.string().optional().describe("Lý do xin quyền"),
  },
  async handler(args, ctx) {
    const db = getDb();
    const resource = args.resource as string;
    const access = (args.access as string) ?? "CRU";
    const reason = (args.reason as string) ?? "";

    // Find an admin/manager to approve
    const admins = await db
      .collection("tenant_users")
      .find({ tenantId: ctx.tenantId, isActive: true })
      .toArray();

    // Prefer manager, fallback to admin
    const approver =
      admins.find((a: any) => a.role === "manager") ??
      admins.find((a: any) => a.role === "admin");

    if (!approver) return err("Không tìm được người duyệt");

    const now = nowMs();
    const result = await db.collection("permission_requests").insertOne({
      tenantId: ctx.tenantId,
      requesterId: ctx.userId,
      requesterName: ctx.userName,
      approverId: approver.channelUserId,
      approverName: approver.displayName ?? "Admin",
      resource,
      requestedAccess: access,
      reason,
      status: "pending",
      createdAt: now,
    } as any);
    const requestId = result.insertedId.toHexString();

    return ok({
      requestSent: true,
      requestId,
      approver: approver.displayName ?? "Admin",
      resource,
      access,
      __notify_user__: {
        userId: approver.channelUserId,
        message: `<b>${ctx.userName}</b> xin quyền <b>${access}</b> trên <b>${resource}</b>\n\nLý do: ${reason || "Không nêu"}\n\n<code>/grant ${ctx.userId} ${resource} ${access}</code>\n<code>/deny ${requestId}</code>`,
      },
    });
  },
};
export default skill;

