import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "update_form_field",
  description: "Lưu 1 field vào form đang điền (field_name, value). Sau khi lưu, hỏi field tiếp theo. Khi completed=true, dữ liệu đã được lưu thật vào DB và savedRowId là ID thật — chỉ xác nhận lưu thành công khi có savedRowId.",
  category: "forms",
  mutating: true,
  inputSchema: {
    field_name: z.string().describe("Tên field cần cập nhật"),
    value: z.unknown().describe("Giá trị field"),
  },
  async handler(args, ctx) {
    const sessionId = ctx.sessionId;
    if (!sessionId) return err("No session");

    const session = await getDb()
      .collection("conversation_sessions")
      .findOne({ _id: new ObjectId(sessionId) });
    if (!session) return err(`Session ${sessionId} not found`);

    let state = session.state as any;
    if (typeof state === "string") {
      try {
        state = JSON.parse(state);
      } catch {
        state = { messages: [] };
      }
    }

    const formState = state.formState;
    if (!formState) return err("No form in progress");

    // Save field value
    formState.data[args.field_name as string] = args.value;

    // Remove from pending
    formState.pendingFields = formState.pendingFields.filter(
      (f: string) => f !== (args.field_name as string),
    );
    formState.currentStep =
      formState.totalSteps - formState.pendingFields.length;

    // Check if form is complete
    if (formState.pendingFields.length === 0) {
      formState.status = "completed";

      // ── Auto-save to collection ───────────────────────────
      // Find collection matching form name, or create one if missing.
      // All form submissions go to collection_rows with _formType for filtering.
      const db = getDb();
      const tenantId = ctx.tenantId;
      const formName: string = formState.formName ?? "Unknown Form";
      const formNameLower = formName.toLowerCase();

      let col = await db.collection("collections").findOne({
        tenantId,
        $or: [
          { name: { $regex: formNameLower, $options: "i" } },
          { slug: { $regex: formNameLower.replace(/\s+/g, "-"), $options: "i" } },
        ],
      } as any);

      if (!col) {
        const slug = formName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const now2 = nowMs();
        const inserted = await db.collection("collections").insertOne({
          tenantId,
          name: formName,
          slug,
          description: `Dữ liệu từ form: ${formName}`,
          fields: [],
          isActive: true,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
          createdAt: now2,
          updatedAt: now2,
        } as any);
        col = { _id: inserted.insertedId } as any;
      }

      const collectionId = String((col as any)._id);
      const rowData = { ...formState.data, _formType: formName };
      const now3 = nowMs();
      const rowResult = await db.collection("collection_rows").insertOne({
        collectionId,
        tenantId,
        data: rowData,
        createdBy: ctx.userId,
        createdByName: ctx.userName,
        createdAt: now3,
        updatedAt: now3,
      } as any);

      const savedRowId = rowResult.insertedId.toHexString();
      formState.savedRowId = savedRowId;
      formState.savedCollectionId = collectionId;

      // Compact history: replace verbose form-filling conversation with structured summary
      const keyFields = Object.entries(formState.data as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      const summaryLine =
        `• Form "${formName}" completed → row ${savedRowId} (collection ${collectionId}) | ${keyFields}`;

      // Move to summary instead of keeping as a message
      state.summary = state.summary
        ? `${state.summary}\n${summaryLine}`
        : summaryLine;
      state.messages = [];
    }

    state.formState = formState;

    await getDb()
      .collection("conversation_sessions")
      .updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { state, lastMessageAt: nowMs() } },
      );

    const next = formState.pendingFields[0] ?? null;
    const nextMeta = next ? (formState.fieldMeta?.[next] ?? null) : null;
    return ok({
      saved: true,
      field: args.field_name,
      value: args.value,
      step: formState.currentStep,
      total: formState.totalSteps,
      nextField: next,
      nextFieldMeta: nextMeta,
      completed: formState.status === "completed",
      savedRowId: formState.savedRowId ?? null,
      data: formState.data,
    });
  },
};
export default skill;
