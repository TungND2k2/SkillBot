import { BaseController } from "../../core/controller.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { AuditLogsListDto } from "../../shared/dto.js";
import type { AuditLogService } from "./audit-log.service.js";

export class AuditLogController extends BaseController<AppEnv> {
  readonly basePath = "/api/audit";

  constructor(private readonly service: AuditLogService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const logs = await this.service.listRecent();
      const body: AuditLogsListDto = { logs: logs.map((l) => l.toDto()) };
      return c.json(body);
    });
  }
}
