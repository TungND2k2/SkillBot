import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "search_rows",
  description:
    "Tìm kiếm across tất cả bảng dữ liệu. Args: keyword?, limit?",
  category: "collections",
  mutating: false,
  inputSchema: {
    keyword: z.string().optional().describe("Từ khoá tìm kiếm (ILIKE)"),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Số kết quả tối đa mỗi bảng"),
  },
  async handler(args, ctx) {
    const keyword = args.keyword as string | undefined;
    const limit = (args.limit as number) ?? 20;
    const db = getDb();

    const cols = await db
      .collection("collections")
      .find({ tenantId: ctx.tenantId, isActive: true })
      .project({ name: 1 })
      .toArray();

    if (cols.length === 0) {
      return ok({ results: [], total: 0 });
    }

    const results: {
      collection: string;
      id: string;
      data: unknown;
      createdAt: number;
    }[] = [];

    for (const col of cols) {
      const allRows = await db
        .collection("collection_rows")
        .find({ collectionId: String((col as any)._id) })
        .sort({ createdAt: -1 })
        .toArray();

      const rows = keyword
        ? allRows.filter((doc: any) =>
            JSON.stringify(doc.data)
              .toLowerCase()
              .includes(keyword.toLowerCase()),
          )
        : allRows;

      for (const row of (rows as any[]).slice(0, limit)) {
        results.push({
          collection: col.name,
          id: String((row as any)._id),
          data: row.data,
          createdAt: row.createdAt,
        });
      }
    }

    return ok({ results, total: results.length });
  },
};

export default skill;
