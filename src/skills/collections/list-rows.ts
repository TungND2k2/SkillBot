import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

/** Fuzzy-find a collection by name or slug within a tenant. */
async function findCollection(tenantId: string, nameOrSlug: string) {
  const all = await getDb()
    .collection("collections")
    .find({ tenantId, isActive: true })
    .toArray();
  const lower = nameOrSlug.toLowerCase();
  return (
    all.find(
      (c: any) =>
        c.name.toLowerCase() === lower ||
        c.slug === lower ||
        c.name.toLowerCase().includes(lower) ||
        c.slug.includes(lower),
    ) ?? null
  );
}

const skill: SkillDef = {
  name: "list_rows",
  description:
    "Xem dữ liệu trong bảng. Args: collection, limit?, offset?, keyword?",
  category: "collections",
  mutating: false,
  inputSchema: {
    collection: z
      .string()
      .optional()
      .describe("Tên hoặc slug của bảng (fuzzy match)"),
    collection_id: z.string().optional().describe("ID bảng (nếu đã biết)"),
    limit: z.number().optional().default(20).describe("Số dòng tối đa"),
    offset: z.number().optional().default(0).describe("Bỏ qua N dòng đầu"),
    keyword: z
      .string()
      .optional()
      .describe("Tìm kiếm trong dữ liệu (ILIKE)"),
  },
  async handler(args, ctx) {
    let collectionId = args.collection_id as string | undefined;

    if (!collectionId) {
      const nameHint =
        (args.collection as string) ?? (args.collection_id as string) ?? "";
      const col = await findCollection(ctx.tenantId, nameHint);
      if (!col) {
        return err(
          `Collection "${args.collection ?? args.collection_id}" không tồn tại`,
        );
      }
      collectionId = String((col as any)._id);
    }

    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    const keyword = args.keyword as string | undefined;
    const db = getDb();

    if (keyword) {
      const kw = keyword.toLowerCase();
      const allRows = await db
        .collection("collection_rows")
        .find({ collectionId })
        .sort({ createdAt: -1 })
        .toArray();

      const filtered = allRows.filter((doc: any) =>
        JSON.stringify(doc.data).toLowerCase().includes(kw),
      );

      const total = filtered.length;
      const rows = filtered.slice(offset, offset + limit).map((doc: any) => ({
        id: String((doc as any)._id),
        data: doc.data,
        createdAt: doc.createdAt,
      }));
      const hasMore = offset + limit < total;

      if (hasMore) {
        return ok({
          rows,
          total,
          showing: rows.length,
          hasMore: true,
          hint: `Còn ${total - rows.length} rows. Dùng offset=${offset + limit} để xem tiếp.`,
        });
      }
      return ok({ rows, total });
    }

    const total = await db
      .collection("collection_rows")
      .countDocuments({ collectionId });

    const rawRows = await db
      .collection("collection_rows")
      .find({ collectionId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const rows = rawRows.map((doc: any) => ({
      id: String(doc._id),
      data: doc.data,
      createdAt: doc.createdAt,
    }));

    const hasMore = offset + limit < total;
    if (hasMore) {
      return ok({
        rows,
        total,
        showing: rows.length,
        hasMore: true,
        hint: `Còn ${total - rows.length} rows. Dùng offset=${offset + limit} để xem tiếp.`,
      });
    }
    return ok({ rows, total });
  },
};

export default skill;
