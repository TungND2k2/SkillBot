import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_crons",
  description: "Xem cron jobs",
  category: "scheduling",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const rows = await getDb()
      .collection("cron_jobs")
      .find({ tenantId: ctx.tenantId })
      .sort({ nextRunAt: 1 })
      .toArray();

    const crons = rows.map((c: any) => ({
      id: String((c as any)._id),
      name: c.name,
      schedule: c.scheduleDescription ?? c.schedule,
      action: c.action,
      status: c.status,
      runCount: c.runCount,
      lastResult: c.lastResult?.substring(0, 100),
      nextRun: c.nextRunAt ? new Date(Number(c.nextRunAt)).toISOString() : null,
    }));

    return ok(crons);
  },
};
export default skill;
