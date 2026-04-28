import type { Filter } from "mongodb";
import type { AuditLogDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { AuditLog } from "./audit-log.entity.js";

export class AuditLogRepository extends BaseRepository<AuditLogDoc> {
  protected readonly collectionName = "audit_logs";

  async listRecent(limit = 200): Promise<AuditLog[]> {
    const docs = await this.findManyRaw({} as Filter<AuditLogDoc>, {
      sort: { createdAt: -1 },
      limit,
    });
    return docs.map((d) => new AuditLog(d));
  }
}
