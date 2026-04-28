import type { AuditLogDoc } from "../../db/types.js";
import type { AuditLogDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class AuditLog {
  constructor(private readonly doc: AuditLogDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get userId(): string { return this.doc.userId; }
  get userName(): string | null { return this.doc.userName ?? null; }
  get userRole(): string | null { return this.doc.userRole ?? null; }
  get action(): string { return this.doc.action; }
  get resourceTable(): string { return this.doc.resourceTable; }
  get resourceId(): string | null { return this.doc.resourceId ?? null; }

  toDto(): AuditLogDto {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      action: this.action,
      resourceTable: this.resourceTable,
      resourceId: this.resourceId,
      createdAt: this.doc.createdAt,
    };
  }
}
