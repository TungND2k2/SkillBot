import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_collections",
  description: "Xem danh sách bảng dữ liệu đang hoạt động",
  category: "collections",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const docs = await getDb()
      .collection("collections")
      .find({ tenantId: ctx.tenantId, isActive: true })
      .toArray();

    return ok({ collections: (docs as any[]).map(d => ({ id: String(d._id), name: d.name, slug: d.slug, description: d.description, fields: d.fields })), total: docs.length });
  },
};

export default skill;
