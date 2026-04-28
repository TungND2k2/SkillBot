import type { TenantUserDoc } from "../../db/types.js";
import type { TenantUserDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

/**
 * TenantUser — a person mapped into a tenant via a channel identity.
 * For Telegram, `channelUserId` is the numeric Telegram user ID.
 *
 * This is the *bot-side* user (someone who chats with the Telegram bot).
 * For the *web-side* identity that logs into the dashboard, see WebUser.
 */
export class TenantUser {
  constructor(private readonly doc: TenantUserDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get channel(): string { return this.doc.channel; }
  get channelUserId(): string { return this.doc.channelUserId; }
  get displayName(): string { return this.doc.displayName ?? this.doc.channelUserId; }
  get role(): string { return this.doc.role; }
  get isActive(): boolean { return this.doc.isActive; }

  /** True for admin or manager — used for back-office actions. */
  get isPrivileged(): boolean {
    return this.role === "admin" || this.role === "manager";
  }

  toDto(): TenantUserDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      channel: this.channel,
      channelUserId: this.channelUserId,
      displayName: this.displayName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
    };
  }
}
