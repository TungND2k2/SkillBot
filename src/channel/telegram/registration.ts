import { ObjectId } from "mongodb";
import type { DbInstance } from "../../db/connection.js";
import type { TenantUserDoc } from "../../db/types.js";
import { nowMs } from "../../utils/clock.js";
import { logger } from "../../utils/logger.js";

export const CHANNEL = "telegram";

// ── Types ────────────────────────────────────────────────────

export interface ResolvedUser {
  tenantId: string;
  channelUserId: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

export type RegistrationResult =
  | { status: "ok"; user: ResolvedUser }
  | { status: "not_registered"; message: string }
  | { status: "pending_approval"; message: string }
  | { status: "inactive"; message: string }
  | { status: "no_tenant"; message: string };

export type RegisterResult =
  | { status: "already_active" }
  | { status: "already_pending" }
  | { status: "registered"; adminChannelUserIds: string[] };

// ── Public API ────────────────────────────────────────────────

/**
 * Resolve a Telegram user against a tenant.
 *
 * Flow:
 *  1. Tenant must exist and be active (matched by botToken).
 *  2. If user is not yet registered → create with role "user", status pending
 *     if tenant requires approval, otherwise active.
 *  3. Return resolved user or a status indicating why they can't proceed.
 */
export async function resolveUser(
  db: DbInstance,
  tenantId: string,
  telegramUserId: string,
  displayName: string
): Promise<RegistrationResult> {
  // Load tenant
  const tenant = await db.collection("tenants").findOne({ _id: new ObjectId(tenantId) });

  if (!tenant || tenant.status !== "active") {
    return { status: "no_tenant", message: "Bot này chưa được kích hoạt." };
  }

  // Find existing user
  const existing = await db.collection("tenant_users").findOne({
    tenantId, channel: CHANNEL, channelUserId: telegramUserId,
  });

  if (!existing) {
    return {
      status: "not_registered",
      message: "Bạn chưa được đăng ký hệ thống. Gõ /register để đăng ký tài khoản, admin sẽ xem xét và phê duyệt.",
    };
  }

  if (!existing.isActive) {
    return {
      status: "pending_approval",
      message: "Tài khoản của bạn đang chờ phê duyệt từ quản trị viên. Vui lòng chờ.",
    };
  }

  // Normalize role: if role field looks like an ObjectId hex, resolve it to the name
  let roleName: string = existing.role;
  if (/^[0-9a-f]{24}$/.test(roleName)) {
    const roleDoc = await db.collection("tenant_roles").findOne({ _id: new ObjectId(roleName) });
    if (roleDoc) {
      roleName = roleDoc.name as string;
      // Fix the stored value
      await db.collection("tenant_users").updateOne(
        { _id: existing._id },
        { $set: { role: roleName, roleId: roleName !== existing.role ? String(roleDoc._id) : existing.roleId, updatedAt: nowMs() } }
      );
    }
  }

  // Update displayName if changed
  if (existing.displayName !== displayName) {
    await db.collection("tenant_users").updateOne(
      { _id: existing._id },
      { $set: { displayName, updatedAt: nowMs() } }
    );
  }

  return {
    status: "ok",
    user: {
      tenantId,
      channelUserId: telegramUserId,
      displayName,
      role: roleName,
      isActive: true,
    },
  };
}

/**
 * Register a new user (creates pending account) and return admin IDs to notify.
 */
export async function registerUser(
  db: DbInstance,
  tenantId: string,
  telegramUserId: string,
  displayName: string
): Promise<RegisterResult> {
  const existing = await db.collection("tenant_users").findOne({
    tenantId, channel: CHANNEL, channelUserId: telegramUserId,
  });

  if (existing) {
    return existing.isActive ? { status: "already_active" } : { status: "already_pending" };
  }

  const now = nowMs();
  const defaultRole = await db.collection("tenant_roles").findOne({ tenantId, name: "user" });
  await db.collection<TenantUserDoc>("tenant_users").insertOne({
    tenantId, channel: CHANNEL, channelUserId: telegramUserId,
    displayName, role: "user",
    ...(defaultRole ? { roleId: String(defaultRole._id) } : {}),
    isActive: false, createdAt: now, updatedAt: now,
  } as any);

  logger.info(
    "Registration",
    `New user ${displayName} (${telegramUserId}) registered on tenant ${tenantId} — pending approval`
  );

  const adminChannelUserIds = await getTenantAdmins(db, tenantId);
  return { status: "registered", adminChannelUserIds };
}

/**
 * Return the list of admin/manager channelUserIds for a tenant,
 * used to send approval notifications.
 */
export async function getTenantAdmins(
  db: DbInstance,
  tenantId: string
): Promise<string[]> {
  const admins = await db.collection("tenant_users").find({
    tenantId, channel: CHANNEL, isActive: true,
  }).toArray();

  return admins
    .filter((u: any) => ["admin", "manager"].includes(u.role))
    .map((u: any) => u.channelUserId);
}

/**
 * Check if a Telegram user ID is a super-admin.
 */
export async function isSuperAdmin(
  db: DbInstance,
  telegramUserId: string
): Promise<boolean> {
  const row = await db.collection("super_admins").findOne({
    channel: CHANNEL, channelUserId: telegramUserId,
  });
  return row !== null;
}
