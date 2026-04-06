import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import type { CollectionDoc } from "../../db/types.js";
import { nowMs } from "../../utils/clock.js";

async function findCollection(tenantId: string, nameOrSlug: string): Promise<CollectionDoc | null> {
  const all = await getDb().collection<CollectionDoc>("collections")
    .find({ tenantId, isActive: true }).toArray();
  const lower = nameOrSlug.toLowerCase();
  return all.find((c) =>
    c.name.toLowerCase() === lower || c.slug === lower ||
    c.name.toLowerCase().includes(lower) || c.slug.includes(lower)
  ) ?? null;
}

const skill: SkillDef = {
  name: "add_row",
  description: "Thêm dòng vào bảng. Args: collection (tên bảng), data{key:value}",
  category: "collections",
  mutating: true,
  inputSchema: {
    collection: z.string().optional().describe("Tên hoặc slug của bảng (fuzzy match)"),
    collection_id: z.string().optional().describe("ID bảng (nếu đã biết)"),
    data: z.record(z.unknown()).describe("Dữ liệu dòng mới {key: value}"),
  },
  async handler(args, ctx) {
    let collectionId = args.collection_id as string | undefined;

    if (!collectionId) {
      const nameHint = (args.collection as string) ?? (args.collection_id as string) ?? "";
      const col = await findCollection(ctx.tenantId, nameHint);
      if (!col) return err(`Collection "${args.collection ?? args.collection_id}" không tồn tại`);
      collectionId = String((col as any)._id);
    }

    const now = nowMs();
    const data = (args.data as Record<string, unknown>) ?? {};

    const result = await getDb().collection("collection_rows").insertOne({
      collectionId, data,
      createdBy: ctx.userId, createdByName: ctx.userName,
      createdAt: now, updatedAt: now,
    } as any);

    return ok({ id: result.insertedId.toHexString(), ...data });
  },
};

export default skill;

