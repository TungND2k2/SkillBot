import type { TenantDoc } from "../../db/types.js";
import type { TenantDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

/**
 * Tenant — a single deployment/customer with its own Telegram bot.
 *
 * Wraps a `TenantDoc` and exposes computed accessors + a `toDto()` for
 * the wire format. Mutations go through repository/service, not the entity.
 */
export class Tenant {
  constructor(private readonly doc: TenantDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get name(): string { return this.doc.name; }
  get botUsername(): string | null { return this.doc.botUsername ?? null; }
  get botStatus(): string { return this.doc.botStatus; }
  get status(): string { return this.doc.status; }
  get instructions(): string { return this.doc.instructions; }
  get isActive(): boolean { return this.doc.status === "active"; }
  get hasBotToken(): boolean { return !!this.doc.botToken; }

  toDto(): TenantDto {
    return {
      id: this.id,
      name: this.name,
      botUsername: this.botUsername,
      botStatus: this.botStatus,
      status: this.status,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
    };
  }
}
