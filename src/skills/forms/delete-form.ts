import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "delete_form",
  description: "Xóa (soft-delete) form template. Dùng list_forms để lấy form_id.",
  category: "forms",
  mutating: true,
  inputSchema: {
    form_id: z.string().optional().describe("ID form template (ưu tiên hơn form_name)"),
    form_name: z.string().optional().describe("Tên form để tìm (fuzzy match)"),
  },
  async handler(args, ctx) {
    const db = getDb();

    // Resolve form
    let formId = args.form_id as string | undefined;
    let formName = "";
    if (!formId && args.form_name) {
      const all = await db.collection("form_templates").find({ tenantId: ctx.tenantId, status: "active" }).toArray();
      const match = all.find((f: any) => f.name.toLowerCase().includes((args.form_name as string).toLowerCase()));
      if (!match) return err(`Form "${args.form_name}" không tìm thấy. Dùng list_forms để xem danh sách.`);
      formId = String((match as any)._id);
      formName = match.name as string;
    }
    if (!formId) return err("Cần cung cấp form_id hoặc form_name.");

    const existing = await db.collection("form_templates").findOne({ _id: new ObjectId(formId), tenantId: ctx.tenantId });
    if (!existing) return err(`Form ID "${formId}" không tồn tại.`);
    if (existing.status === "deleted") return err("Form này đã bị xóa trước đó.");

    await db.collection("form_templates").updateOne(
      { _id: new ObjectId(formId) },
      { $set: { status: "deleted", updatedAt: nowMs() } },
    );

    return ok({
      deleted: true,
      id: formId,
      name: formName || existing.name,
    });
  },
};
export default skill;
