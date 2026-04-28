import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { CronJobsListDto } from "../../shared/dto.js";
import type { CronJobService } from "./cron-job.service.js";

export class CronJobController extends BaseController<AppEnv> {
  readonly basePath = "/api/crons";

  constructor(private readonly service: CronJobService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const jobs = await this.service.list(s.tenantId);
      const body: CronJobsListDto = { jobs: jobs.map((j) => j.toDto()) };
      return c.json(body);
    });
  }
}
