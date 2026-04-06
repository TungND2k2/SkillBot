import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "get_knowledge",
  description: "Xem kiến thức bot đã học",
  category: "knowledge",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const doc = await getDb()
      .collection("bot_docs")
      .findOne({ tenantId: ctx.tenantId });
    const content = doc?.content ?? "Chưa có kiến thức.";
    return ok({ content });
  },
};
export default skill;
