import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "create_cron",
  description: "Tạo cron job. Args: name, schedule, action (tên tool), action_args?",
  category: "scheduling",
  mutating: true,
  inputSchema: {
    name: z.string().describe("Tên cron job"),
    schedule: z.string().describe("Cron expression hoặc mô tả (vd: every 5 minutes, daily at 9am)"),
    action: z.string().describe("Tên tool sẽ chạy"),
    action_args: z.record(z.unknown()).optional().describe("Args cho tool"),
  },
  async handler(args, ctx) {
    const now = nowMs();
    const schedule = args.schedule as string;
    const name = args.name as string;
    const action = args.action as string;
    const actionArgs = (args.action_args as Record<string, unknown>) ?? {};
    const scheduleDescription = schedule;
    const nextRunAt = now + 60_000;

    const result = await getDb().collection("cron_jobs").insertOne({
      tenantId: ctx.tenantId,
      name,
      schedule,
      scheduleDescription,
      action,
      args: actionArgs,
      notifyUserId: ctx.userId,
      status: "active",
      nextRunAt,
      runCount: 0,
      createdByUserId: ctx.userId,
      createdByName: ctx.userName,
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({
      id: result.insertedId.toHexString(),
      name,
      schedule: scheduleDescription,
      nextRun: new Date(nextRunAt).toISOString(),
    });
  },
};
export default skill;

