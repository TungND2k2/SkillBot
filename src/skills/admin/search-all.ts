import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "search_all",
  description: "Tìm kiếm across tất cả bảng (keyword?, limit?)",
  category: "admin",
  mutating: false,
  inputSchema: {
    keyword: z.string().optional().describe("Từ khoá tìm kiếm"),
    limit: z.number().optional().default(20).describe("Số kết quả tối đa"),
  },
  async handler(args, ctx) {
    const db = getDb();
    const keyword = (args.keyword as string) ?? "";
    const limit = (args.limit as number) ?? 20;

    // Get all active tenant collections
    const cols = await db
      .collection("collections")
      .find({ tenantId: ctx.tenantId, isActive: true })
      .project({ name: 1 })
      .toArray();

    if (cols.length === 0) return ok([]);

    const results: any[] = [];

    for (const col of cols) {
      const allRows = await db
        .collection("collection_rows")
        .find({ collectionId: String((col as any)._id) })
        .sort({ createdAt: -1 })
        .toArray();

      const filtered = keyword
        ? allRows.filter((row: any) =>
            JSON.stringify(row.data).toLowerCase().includes(keyword.toLowerCase()),
          )
        : allRows;

      for (const row of (filtered as any[]).slice(0, limit)) {
        results.push({
          id: String((row as any)._id),
          collection_id: row.collectionId,
          collection_name: col.name,
          data: row.data,
          created_at: row.createdAt,
          created_by_name: row.createdByName,
        });
      }

      if (results.length >= limit) break;
    }

    return ok(results.slice(0, limit));
  },
};
export default skill;
