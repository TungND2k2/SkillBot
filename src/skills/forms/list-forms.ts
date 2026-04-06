import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_forms",
  description:
    "Xem form template (tên, fields, required). Args: name? (nếu không có → list tất cả)",
  category: "forms",
  mutating: false,
  inputSchema: {
    name: z
      .string()
      .optional()
      .describe("Tên form để tìm (tìm gần đúng). Bỏ trống = list tất cả"),
  },
  async handler(args, ctx) {
    const rows = await getDb()
      .collection("form_templates")
      .find({ tenantId: ctx.tenantId, status: "active" })
      .toArray();

    if (args.name) {
      const match = rows.find((r: any) =>
        r.name.toLowerCase().includes((args.name as string).toLowerCase()),
      );
      if (match) {
        const schema =
          typeof match.schema === "string"
            ? JSON.parse(match.schema)
            : match.schema;
        return ok({
          id: String((match as any)._id),
          name: match.name,
          version: match.version,
          fields: (schema as any)?.fields ?? [],
        });
      }
      return err(`Form "${args.name}" không tìm thấy`);
    }

    return ok(
      rows.map((r: any) => {
        const schema =
          typeof r.schema === "string" ? JSON.parse(r.schema) : r.schema;
        return {
          id: String((r as any)._id),
          name: r.name,
          version: r.version,
          fieldCount: ((schema as any)?.fields ?? []).length,
        };
      }),
    );
  },
};
export default skill;
