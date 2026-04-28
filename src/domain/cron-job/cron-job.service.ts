import type { CronJob } from "./cron-job.entity.js";
import type { CronJobRepository } from "./cron-job.repository.js";

export class CronJobService {
  constructor(private readonly repo: CronJobRepository) {}

  list(tenantId: string): Promise<CronJob[]> {
    return this.repo.listByTenant(tenantId);
  }
}
