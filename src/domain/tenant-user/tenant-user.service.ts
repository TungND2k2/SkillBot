import { NotFoundError } from "../../core/errors.js";
import type { TenantUser } from "./tenant-user.entity.js";
import type { TenantUserRepository, SuperAdminRepository } from "./tenant-user.repository.js";

export class TenantUserService {
  constructor(
    private readonly users: TenantUserRepository,
    private readonly superAdmins: SuperAdminRepository,
  ) {}

  listByTenant(tenantId: string): Promise<TenantUser[]> {
    return this.users.listByTenant(tenantId);
  }

  countActiveByTenant(tenantId: string): Promise<number> {
    return this.users.countActiveByTenant(tenantId);
  }

  countActive(): Promise<number> {
    return this.users.count({ isActive: true } as never);
  }

  isSuperAdmin(channel: string, channelUserId: string): Promise<boolean> {
    return this.superAdmins.exists(channel, channelUserId);
  }

  findMembership(
    tenantId: string,
    channel: string,
    channelUserId: string,
  ): Promise<TenantUser | null> {
    return this.users.findByChannel(tenantId, channel, channelUserId);
  }

  listMemberships(channel: string, channelUserId: string): Promise<TenantUser[]> {
    return this.users.listMembershipsByChannel(channel, channelUserId);
  }

  async getById(id: string): Promise<TenantUser> {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundError("Người dùng");
    return u;
  }
}
