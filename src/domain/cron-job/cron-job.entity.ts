import type { CronJobDoc } from "../../db/types.js";
import type { CronJobDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class CronJob {
  constructor(private readonly doc: CronJobDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get name(): string { return this.doc.name; }
  get schedule(): string { return this.doc.schedule; }
  get scheduleDescription(): string | null { return this.doc.scheduleDescription ?? null; }
  get action(): string { return this.doc.action; }
  get status(): string { return this.doc.status; }
  get lastRunAt(): number | null { return this.doc.lastRunAt ?? null; }
  get nextRunAt(): number | null { return this.doc.nextRunAt ?? null; }
  get runCount(): number { return this.doc.runCount; }
  get lastResult(): string | null { return this.doc.lastResult ?? null; }

  toDto(): CronJobDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      schedule: this.schedule,
      scheduleDescription: this.scheduleDescription,
      action: this.action,
      status: this.status,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      runCount: this.runCount,
      lastResult: this.lastResult,
      createdAt: this.doc.createdAt,
    };
  }
}
