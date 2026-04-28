import type { WebUserDoc } from "../../db/types.js";
import type { WebUserDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

/**
 * Web dashboard user. Independent identity from Telegram tenant_users
 * — though usually auto-created when a Telegram user registers and linked
 * back via `linkedChannelUserId`.
 *
 * `passwordHash` is treated as a write-only secret: never exposed via the
 * DTO. Use `WebUserService.setPassword()` and `WebUserService.authenticate()`
 * for any password handling.
 */
export class WebUser {
  constructor(private readonly doc: WebUserDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get username(): string { return this.doc.username; }
  get displayName(): string { return this.doc.displayName; }
  get role(): string { return this.doc.role; }
  get isSuperAdmin(): boolean { return this.doc.isSuperAdmin; }
  get isActive(): boolean { return this.doc.isActive; }
  get hasPassword(): boolean { return !!this.doc.passwordHash; }
  get linkedChannel(): string | undefined { return this.doc.linkedChannel; }
  get linkedChannelUserId(): string | undefined { return this.doc.linkedChannelUserId; }

  /** Internal use only — services that need to verify password. Never expose. */
  get passwordHashForVerification(): string | null {
    return this.doc.passwordHash;
  }

  toDto(): WebUserDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      username: this.username,
      displayName: this.displayName,
      role: this.role,
      isSuperAdmin: this.isSuperAdmin,
      isActive: this.isActive,
      hasPassword: this.hasPassword,
      linkedChannel: this.linkedChannel,
      linkedChannelUserId: this.linkedChannelUserId,
    };
  }
}
