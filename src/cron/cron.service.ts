import { ObjectId } from "mongodb";
import type { DbInstance } from "../db/connection.js";
import type { CronJobDoc } from "../db/types.js";
import type { Config } from "../config.js";
import { getSkill } from "../skills/_registry.js";
import type { SkillContext } from "../skills/_types.js";
import { nowMs } from "../utils/clock.js";
import { logger } from "../utils/logger.js";

/**
 * Simple cron service: ticks every `config.CRON_TICK_MS` ms,
 * finds jobs whose `nextRunAt` is due, runs the associated skill,
 * and updates `lastRunAt` / `nextRunAt` / `runCount`.
 *
 * nextRunAt scheduling is naive (+intervalMs) — a real cron parser
 * can be plugged in later by replacing computeNextRun().
 */
export class CronService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly db: DbInstance,
    private readonly config: Config
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
    logger.info("Cron", "Cron service started");
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    if (!this.running) return;
    this.runDueJobs()
      .catch((err) => logger.error("Cron", "Tick error", err))
      .finally(() => {
        if (this.running) {
          this.timer = setTimeout(() => this.tick(), this.config.CRON_TICK_MS);
        }
      });
  }

  private async runDueJobs(): Promise<void> {
    const now = nowMs();

    const due = await this.db.collection<CronJobDoc>("cron_jobs").find(
      { status: "active", nextRunAt: { $lte: now } }
    ).toArray();

    if (due.length === 0) return;
    logger.debug("Cron", `${due.length} job(s) due`);

    await Promise.all(due.map((job) => this.runJob(job, now)));
  }

  private async runJob(
    job: CronJobDoc,
    now: number
  ): Promise<void> {
    const skill = getSkill(job.action);
    if (!skill) {
      logger.warn("Cron", `Job "${job.name}" references unknown skill "${job.action}"`);
      await this.markDone(String(job._id), now, `error: unknown skill ${job.action}`);
      return;
    }

    const ctx: SkillContext = {
      tenantId: job.tenantId,
      userId: job.notifyUserId ?? "cron",
      channelUserId: job.notifyUserId ?? "cron",
      userName: "CronJob",
      userRole: "admin",      // cron runs with admin-level access
      sessionId: "cron",
      db: this.db,
    };

    try {
      const args = (job.args ?? {}) as Record<string, unknown>;
      const result = await skill.handler(args, ctx);
      const summary = result.isError
        ? `error: ${result.content[0]?.text ?? "unknown"}`
        : "ok";
      logger.info("Cron", `Job "${job.name}" ran → ${summary}`);
      await this.markDone(String(job._id), now, summary);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("Cron", `Job "${job.name}" threw: ${msg}`, error);
      await this.markDone(String(job._id), now, `error: ${msg}`);
    }
  }

  private async markDone(
    jobId: string,
    ranAt: number,
    lastResult: string
  ): Promise<void> {
    // Simple requeue: next run in ~1 minute (12 × tick interval)
    const nextRunAt = ranAt + this.config.CRON_TICK_MS * 12;

    await this.db.collection("cron_jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: { lastRunAt: ranAt, nextRunAt, lastResult: lastResult.slice(0, 500), updatedAt: nowMs() },
        $inc: { runCount: 1 },
      }
    );
  }
}
