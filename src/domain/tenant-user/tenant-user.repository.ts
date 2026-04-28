import type { Filter } from "mongodb";
import type { TenantUserDoc, SuperAdminDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { toObjectId } from "../../core/id.js";
import { TenantUser } from "./tenant-user.entity.js";

export class TenantUserRepository extends BaseRepository<TenantUserDoc> {
  protected readonly collectionName = "tenant_users";

  async findById(id: string): Promise<TenantUser | null> {
    const doc = await this.findOneRaw({ _id: toObjectId(id) } as Filter<TenantUserDoc>);
    return doc ? new TenantUser(doc) : null;
  }

  async findByChannel(
    tenantId: string,
    channel: string,
    channelUserId: string,
  ): Promise<TenantUser | null> {
    const doc = await this.findOneRaw({
      tenantId,
      channel,
      channelUserId,
    } as Filter<TenantUserDoc>);
    return doc ? new TenantUser(doc) : null;
  }

  async listMembershipsByChannel(channel: string, channelUserId: string): Promise<TenantUser[]> {
    const docs = await this.findManyRaw({
      channel,
      channelUserId,
      isActive: true,
    } as Filter<TenantUserDoc>);
    return docs.map((d) => new TenantUser(d));
  }

  async listByTenant(tenantId: string): Promise<TenantUser[]> {
    const docs = await this.findManyRaw(
      { tenantId, isActive: true } as Filter<TenantUserDoc>,
      { sort: { createdAt: -1 } },
    );
    return docs.map((d) => new TenantUser(d));
  }

  countActiveByTenant(tenantId: string): Promise<number> {
    return this.count({ tenantId, isActive: true } as Filter<TenantUserDoc>);
  }
}

/**
 * Separate repo for the super_admins collection — they are not bound to
 * any tenant; matched by (channel, channelUserId).
 */
export class SuperAdminRepository extends BaseRepository<SuperAdminDoc> {
  protected readonly collectionName = "super_admins";

  async exists(channel: string, channelUserId: string): Promise<boolean> {
    const doc = await this.findOneRaw({ channel, channelUserId } as Filter<SuperAdminDoc>);
    return !!doc;
  }
}
