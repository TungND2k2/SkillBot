import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_roles",
  description: "Liệt kê tất cả roles trong tenant — tên, mô tả, cấp bậc (level)",
  category: "users",
  inputSchema: {},
  async handler(_args, ctx) {
    const db = getDb();
    const roles = await db
      .collection("tenant_roles")
      .find({ tenantId: ctx.tenantId })
      .sort({ level: -1 })
      .toArray();

    return ok(
      roles.map((r: any) => ({
        name: r.name,
        label: r.label,
        description: r.description,
        level: r.level,
        isSystem: r.isSystem,
      }))
    );
  },
};
export default skill;
