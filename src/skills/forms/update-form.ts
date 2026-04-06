import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "update_form",
  description: "Cập nhật form template có sẵn: đổi tên hoặc thay toàn bộ fields. Dùng list_forms để lấy form_id.",
  category: "forms",
  mutating: true,
  inputSchema: {
    form_id: z.string().optional().describe("ID form template (ưu tiên hơn form_name)"),
    form_name: z.string().optional().describe("Tên form để tìm (fuzzy match)"),
    name: z.string().optional().describe("Tên mới cho form (bỏ trống = giữ nguyên)"),
    fields: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string(),
          type: z.string().optional().default("text"),
          required: z.boolean().optional().default(false),
          description: z.string().optional(),
          autoFill: z.enum(["user", "system"]).optional().default("user"),
          options: z.array(z.string()).optional(),
          placeholder: z.string().optional(),
          validation: z.record(z.unknown()).optional(),
        }),
      )
      .optional()
      .describe("Toàn bộ fields mới (thay thế hoàn toàn). Bỏ trống = chỉ đổi tên."),
  },
  async handler(args, ctx) {
    const db = getDb();
    const now = nowMs();

    // Resolve form
    let formId = args.form_id as string | undefined;
    if (!formId && args.form_name) {
      const all = await db.collection("form_templates").find({ tenantId: ctx.tenantId, status: "active" }).toArray();
      const match = all.find((f: any) => f.name.toLowerCase().includes((args.form_name as string).toLowerCase()));
      if (!match) return err(`Form "${args.form_name}" không tìm thấy. Dùng list_forms để xem danh sách.`);
      formId = String((match as any)._id);
    }
    if (!formId) return err("Cần cung cấp form_id hoặc form_name.");

    const existing = await db.collection("form_templates").findOne({ _id: new ObjectId(formId), tenantId: ctx.tenantId });
    if (!existing) return err(`Form ID "${formId}" không tồn tại.`);

    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.name) updates.name = args.name;
    if (args.fields) {
      updates.schema = JSON.stringify({ fields: args.fields });
      updates.version = (existing.version as number ?? 1) + 1;
    }

    await db.collection("form_templates").updateOne(
      { _id: new ObjectId(formId) },
      { $set: updates },
    );

    const updated = await db.collection("form_templates").findOne({ _id: new ObjectId(formId) });
    const schema = typeof updated!.schema === "string" ? JSON.parse(updated!.schema as string) : updated!.schema;

    return ok({
      updated: true,
      id: formId,
      name: updated!.name,
      version: updated!.version,
      fieldCount: ((schema as any).fields ?? []).length,
    });
  },
};
export default skill;
