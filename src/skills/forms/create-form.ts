import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "create_form",
  description: "Tạo form mới. Args: name, fields[{id,label,type,required}]",
  category: "forms",
  mutating: true,
  inputSchema: {
    name: z.string().describe("Tên form template"),
    fields: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string(),
          type: z
            .string()
            .optional()
            .default("text")
            .describe("Loại field: text, number, email, phone, date, select..."),
          required: z.boolean().optional().default(false),
          description: z.string().optional().describe("Mô tả field, hướng dẫn, ghi chú cho AI/user"),
          autoFill: z
            .enum(["user", "system"])
            .optional()
            .default("user")
            .describe("'user' = hỏi người dùng; 'system' = AI/hệ thống tự tạo, không hỏi người dùng"),
          options: z.array(z.string()).optional().describe("Options cho select/radio"),
          placeholder: z.string().optional(),
          validation: z.record(z.unknown()).optional(),
        }),
      )
      .optional()
      .default([])
      .describe("Danh sách fields của form"),
  },
  async handler(args, ctx) {
    const now = nowMs();

    const result = await getDb().collection("form_templates").insertOne({
      tenantId: ctx.tenantId,
      name: args.name as string,
      schema: JSON.stringify({ fields: args.fields ?? [] }),
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as any);

    return ok({ id: result.insertedId.toHexString(), name: args.name });
  },
};
export default skill;

