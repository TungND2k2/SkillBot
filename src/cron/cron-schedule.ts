import { CronExpressionParser } from "cron-parser";

/**
 * Parse a cron expression and return the next fire time as a unix-ms timestamp.
 * Throws if the expression is invalid.
 *
 * Supports standard 5-field cron (`m h dom mon dow`) and 6-field (with seconds).
 * Optionally pass a base time to compute "next after this moment".
 */
export function nextRunAt(schedule: string, fromMs?: number): number {
  const interval = CronExpressionParser.parse(schedule, {
    currentDate: fromMs ? new Date(fromMs) : new Date(),
  });
  return interval.next().getTime();
}

/** Validate a cron expression. Returns null if valid, or an error message. */
export function validateCron(schedule: string): string | null {
  try {
    CronExpressionParser.parse(schedule);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
