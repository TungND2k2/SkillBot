import type { WebSessionDoc } from "../../db/types.js";
import type { SessionDto } from "../../shared/dto.js";

/**
 * WebSession — issued to a user when they log in via the web dashboard.
 * The session ID (cookie value) is `id`, a 64-char random hex token.
 *
 * The session references a `webUserId`; resolving it to the actual `WebUser`
 * entity is the caller's job (typically `AuthService.hydrate`).
 */
export class WebSession {
  constructor(private readonly doc: WebSessionDoc) {}

  get id(): string { return this.doc._id; }
  get webUserId(): string { return this.doc.webUserId; }
  get tenantId(): string | null { return this.doc.tenantId; }
  get isSuperAdmin(): boolean { return this.doc.isSuperAdmin; }
  get expiresAt(): number { return this.doc.expiresAt; }

  isExpired(now: number = Date.now()): boolean {
    return this.doc.expiresAt < now;
  }

  toDto(): SessionDto {
    return {
      webUserId: this.webUserId,
      tenantId: this.tenantId,
      isSuperAdmin: this.isSuperAdmin,
      expiresAt: this.expiresAt,
    };
  }
}
