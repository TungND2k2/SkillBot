import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_workflows",
  description: "Xem danh sách quy trình (workflows) đang active",
  category: "workflows",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const rows = await getDb()
      .collection("workflow_templates")
      .find({ tenantId: ctx.tenantId, status: "active" })
      .toArray();
    return ok((rows as any[]).map(r => ({ id: String(r._id), name: r.name, description: r.description, domain: r.domain })));
  },
};
export default skill;
