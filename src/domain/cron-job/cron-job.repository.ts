import type { Filter } from "mongodb";
import type { CronJobDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { CronJob } from "./cron-job.entity.js";

export class CronJobRepository extends BaseRepository<CronJobDoc> {
  protected readonly collectionName = "cron_jobs";

  async listByTenant(tenantId: string): Promise<CronJob[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<CronJobDoc>,
      { sort: { nextRunAt: 1 } },
    );
    return docs.map((d) => new CronJob(d));
  }
}
