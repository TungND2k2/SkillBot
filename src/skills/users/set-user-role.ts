import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "set_user_role",
  description: "Đổi role user — role phải tồn tại trong bảng tenant_roles. Dùng list_roles để xem danh sách roles hợp lệ.",
  category: "users",
  mutating: true,
  inputSchema: {
    channel_user_id: z.string().describe("User ID hoặc tên user (hỗ trợ fuzzy match)"),
    role: z.string().describe("Tên role mới (ví dụ: admin, manager, user). Phải là role đã được định nghĩa."),
    is_active: z.boolean().optional().describe("Kích hoạt tài khoản (mặc định: true khi đang pending, không đổi nếu đã active)"),
    channel: z.string().optional().default("telegram").describe("Kênh (mặc định telegram)"),
    display_name: z.string().optional().describe("Tên hiển thị mới"),
  },
  async handler(args, ctx) {
    const db = getDb();
    const now = nowMs();
    const channel = (args.channel as string) ?? "telegram";
    const newRoleName = args.role as string;

    // Load caller's role definition for level check
    const callerRoleDoc = await db.collection("tenant_roles").findOne({
      tenantId: ctx.tenantId, name: ctx.userRole,
    });
    if (!callerRoleDoc) {
      return err("Không xác định được quyền của bạn trong hệ thống.");
    }
    // Minimum level to manage roles
    if (callerRoleDoc.level < 50) {
      return err("Bạn không có quyền thay đổi role người dùng.");
    }

    // Validate target role exists in DB
    const targetRoleDoc = await db.collection("tenant_roles").findOne({
      tenantId: ctx.tenantId, name: newRoleName,
    });
    if (!targetRoleDoc) {
      return err(`Role "${newRoleName}" không tồn tại. Dùng list_roles để xem danh sách roles hợp lệ.`);
    }
    // Cannot assign a role with level >= own level (can only assign roles below yourself)
    if (targetRoleDoc.level >= callerRoleDoc.level) {
      return err(`Bạn chỉ có thể gán role có cấp bậc thấp hơn của bạn (level < ${callerRoleDoc.level}).`);
    }

    // Fuzzy name matching: if not a numeric ID, search by display name
    let channelUserId = args.channel_user_id as string;
    if (!/^\d+$/.test(channelUserId)) {
      const allUsers = await db
        .collection("tenant_users")
        .find({ tenantId: ctx.tenantId })
        .toArray();

      const match = allUsers.find(
        (u: any) =>
          u.displayName?.toLowerCase().includes(channelUserId.toLowerCase()) ||
          channelUserId.toLowerCase().includes(u.displayName?.toLowerCase() ?? "___"),
      );
      if (match) {
        channelUserId = match.channelUserId;
      } else {
        return err(`User "${args.channel_user_id}" không tìm thấy. Dùng list_users để xem danh sách.`);
      }
    }

    // Prevent self role change (only pure admin can change own role)
    if (ctx.channelUserId === channelUserId && callerRoleDoc.level < 100) {
      return err("Không thể tự thay đổi role của bản thân.");
    }

    const existing = await db.collection("tenant_users").findOne({
      tenantId: ctx.tenantId, channel, channelUserId,
    });
    if (!existing) {
      return err(`User ID "${channelUserId}" không tồn tại trong hệ thống.`);
    }

    // Cannot change role of someone with equal or higher level
    const existingRoleDoc = await db.collection("tenant_roles").findOne({
      tenantId: ctx.tenantId, name: existing.role,
    });
    if (existingRoleDoc && existingRoleDoc.level >= callerRoleDoc.level) {
      return err(`Không thể thay đổi role của user có cấp bậc bằng hoặc cao hơn bạn.`);
    }

    const newIsActive = args.is_active !== undefined ? (args.is_active as boolean) : (existing.isActive || true);

    await db.collection("tenant_users").updateOne(
      { _id: existing._id },
      {
        $set: {
          role: newRoleName,
          roleId: String(targetRoleDoc._id),
          isActive: newIsActive,
          ...(args.display_name ? { displayName: args.display_name as string } : {}),
          updatedAt: now,
        },
      },
    );

    return ok({
      success: true,
      channel_user_id: channelUserId,
      roleId: String(targetRoleDoc._id),
      role: newRoleName,
      roleLabel: targetRoleDoc.label,
      isActive: newIsActive,
    });
  },
};
export default skill;

