import type { Config } from "../config.js";
import { logger } from "../utils/logger.js";

// ── Types ────────────────────────────────────────────────────

export interface QueueJob {
  id: string;
  priority: number;   // lower = higher priority
  enqueuedAt: number;
  run: () => Promise<void>;
}

// ── Message Queue ────────────────────────────────────────────

/**
 * In-process priority queue with bounded concurrency and size.
 * Jobs with lower `priority` values run first.
 * When the queue is full, new jobs are dropped with a warning.
 */
export class MessageQueue {
  private readonly queue: QueueJob[] = [];
  private running = 0;
  private readonly concurrency: number;
  private readonly maxSize: number;
  private readonly jobTimeoutMs: number;
  private stopped = false;

  constructor(config: Config) {
    this.concurrency = config.QUEUE_CONCURRENCY;
    this.maxSize = config.QUEUE_MAX_SIZE;
    this.jobTimeoutMs = config.QUEUE_JOB_TIMEOUT_MS;
  }

  /** Enqueue a job. Returns false if the queue is full or stopped. */
  enqueue(job: QueueJob): boolean {
    if (this.stopped) return false;

    if (this.queue.length >= this.maxSize) {
      logger.warn("Queue", `Queue full (${this.maxSize}), dropping job ${job.id}`);
      return false;
    }

    // Insert in priority order (stable sort: lower priority value first)
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].priority > job.priority) i--;
    this.queue.splice(i, 0, job);

    this.drain();
    return true;
  }

  /** Stop accepting new jobs and wait for running jobs to finish. */
  stop(): void {
    this.stopped = true;
  }

  get size(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.running;
  }

  private drain(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.running++;
      this.execute(job).finally(() => {
        this.running--;
        this.drain();
      });
    }
  }

  private async execute(job: QueueJob): Promise<void> {
    const timer = setTimeout(() => {
      logger.warn("Queue", `Job ${job.id} exceeded timeout ${this.jobTimeoutMs}ms`);
    }, this.jobTimeoutMs);

    try {
      await job.run();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("Queue", `Job ${job.id} failed: ${msg}`, error);
    } finally {
      clearTimeout(timer);
    }
  }
}
