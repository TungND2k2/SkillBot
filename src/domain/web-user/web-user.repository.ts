import type { Filter, OptionalUnlessRequiredId } from "mongodb";
import type { WebUserDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { toObjectId } from "../../core/id.js";
import { nowMs } from "../../utils/clock.js";
import { WebUser } from "./web-user.entity.js";

export interface CreateWebUserInput {
  tenantId: string;
  username: string;
  displayName: string;
  role: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  linkedChannel?: string;
  linkedChannelUserId?: string;
  linkedTenantUserId?: string;
}

export class WebUserRepository extends BaseRepository<WebUserDoc> {
  protected readonly collectionName = "web_users";

  async findById(id: string): Promise<WebUser | null> {
    const doc = await this.findOneRaw({ _id: toObjectId(id) } as Filter<WebUserDoc>);
    return doc ? new WebUser(doc) : null;
  }

  async findByUsername(username: string): Promise<WebUser | null> {
    const doc = await this.findOneRaw({ username } as Filter<WebUserDoc>);
    return doc ? new WebUser(doc) : null;
  }

  async findByLinkedTelegram(channel: string, channelUserId: string): Promise<WebUser | null> {
    const doc = await this.findOneRaw({
      linkedChannel: channel,
      linkedChannelUserId: channelUserId,
    } as Filter<WebUserDoc>);
    return doc ? new WebUser(doc) : null;
  }

  async create(input: CreateWebUserInput): Promise<WebUser> {
    const now = nowMs();
    const doc = {
      tenantId: input.tenantId,
      username: input.username,
      passwordHash: null,
      displayName: input.displayName,
      role: input.role,
      isSuperAdmin: input.isSuperAdmin ?? false,
      isActive: input.isActive ?? false,
      linkedChannel: input.linkedChannel,
      linkedChannelUserId: input.linkedChannelUserId,
      linkedTenantUserId: input.linkedTenantUserId,
      createdAt: now,
      updatedAt: now,
    } as OptionalUnlessRequiredId<WebUserDoc>;
    const result = await this.collection.insertOne(doc);
    return new WebUser({ ...doc, _id: result.insertedId } as WebUserDoc);
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.updateRawById(userId, {
      $set: { passwordHash, updatedAt: nowMs() },
    });
  }

  async setActive(userId: string, isActive: boolean): Promise<void> {
    await this.updateRawById(userId, { $set: { isActive, updatedAt: nowMs() } });
  }

  async setRole(userId: string, role: string): Promise<void> {
    await this.updateRawById(userId, { $set: { role, updatedAt: nowMs() } });
  }

  async setDisplayName(userId: string, displayName: string): Promise<void> {
    await this.updateRawById(userId, { $set: { displayName, updatedAt: nowMs() } });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.updateRawById(userId, { $set: { lastLoginAt: nowMs() } });
  }
}
