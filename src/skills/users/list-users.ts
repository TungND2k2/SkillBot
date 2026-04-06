import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_users",
  description: "Xem danh sách users",
  category: "users",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const rows = await getDb()
      .collection("tenant_users")
      .find({ tenantId: ctx.tenantId })
      .project({ channelUserId: 1, channel: 1, displayName: 1, role: 1, roleId: 1, isActive: 1, _id: 0 })
      .toArray();

    return ok(rows);
  },
};
export default skill;
