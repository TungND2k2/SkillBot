import type { AuditLog } from "./audit-log.entity.js";
import type { AuditLogRepository } from "./audit-log.repository.js";

export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository) {}

  listRecent(): Promise<AuditLog[]> {
    return this.repo.listRecent();
  }
}
