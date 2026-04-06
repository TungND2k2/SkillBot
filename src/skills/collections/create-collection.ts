import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "create_collection",
  description:
    "Tạo bảng dữ liệu mới. Args: name, description?, fields[{name,type,required?}]",
  category: "collections",
  mutating: true,
  inputSchema: {
    name: z.string().min(1).describe("Tên bảng"),
    description: z.string().optional().describe("Mô tả bảng"),
    fields: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(["text", "number", "date", "url", "boolean"]),
          required: z.boolean().optional(),
        }),
      )
      .optional()
      .describe("Danh sách cột: [{name, type, required?}]"),
  },
  async handler(args, ctx) {
    const now = nowMs();

    const slug = (args.name as string)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const fields = (args.fields as any[]) ?? [];

    const result = await getDb().collection("collections").insertOne({
      tenantId: ctx.tenantId,
      name: args.name as string,
      slug,
      description: (args.description as string) ?? null,
      fields,
      createdBy: ctx.userId ?? null,
      createdByName: ctx.userName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({ id: result.insertedId.toHexString(), name: args.name, slug, fields });
  },
};

export default skill;

