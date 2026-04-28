import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";
import { nextRunAt as cronNextRunAt, validateCron } from "../../cron/cron-schedule.js";

const skill: SkillDef = {
  name: "create_cron",
  description: "Tạo cron job. Args: name, schedule (cron expression 5 trường: 'phút giờ ngày tháng thứ', vd '0 9 * * 1' = thứ Hai 9h), action (tên tool), action_args?",
  category: "scheduling",
  mutating: true,
  inputSchema: {
    name: z.string().describe("Tên cron job"),
    schedule: z.string().describe("Cron expression chuẩn 5 trường (vd: '0 9 * * 1' thứ Hai 9h, '0 17 * * 5' thứ Sáu 17h, '*/15 * * * *' mỗi 15 phút)"),
    action: z.string().describe("Tên tool sẽ chạy"),
    action_args: z.record(z.unknown()).optional().describe("Args cho tool"),
  },
  async handler(args, ctx) {
    const now = nowMs();
    const schedule = args.schedule as string;
    const name = args.name as string;
    const action = args.action as string;
    const actionArgs = (args.action_args as Record<string, unknown>) ?? {};

    const invalid = validateCron(schedule);
    if (invalid) return err(`Cron expression không hợp lệ: ${invalid}`);

    const nextRun = cronNextRunAt(schedule, now);

    const result = await getDb().collection("cron_jobs").insertOne({
      tenantId: ctx.tenantId,
      name,
      schedule,
      scheduleDescription: schedule,
      action,
      args: actionArgs,
      notifyUserId: ctx.userId,
      status: "active",
      nextRunAt: nextRun,
      runCount: 0,
      createdByUserId: ctx.userId,
      createdByName: ctx.userName,
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({
      id: result.insertedId.toHexString(),
      name,
      schedule,
      nextRun: new Date(nextRun).toISOString(),
    });
  },
};
export default skill;

