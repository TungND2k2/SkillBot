import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "start_form",
  description: "Bắt đầu điền form template (form_name). Tự load fields từ DB",
  category: "forms",
  mutating: true,
  inputSchema: {
    form_name: z
      .string()
      .optional()
      .describe("Tên form (tìm gần đúng)"),
    form_id: z.string().optional().describe("ID form template (ưu tiên hơn form_name)"),
  },
  async handler(args, ctx) {
    const sessionId = ctx.sessionId;
    if (!sessionId) return err("No session");

    const db = getDb();

    // Resolve form template
    let formId = args.form_id as string | undefined;
    let formName = args.form_name as string | undefined;

    if (!formId && formName) {
      const forms = await db
        .collection("form_templates")
        .find({ tenantId: ctx.tenantId })
        .toArray();
      const match = forms.find((f: any) =>
        f.name.toLowerCase().includes(formName!.toLowerCase()),
      );
      if (match) {
        formId = String((match as any)._id);
        formName = match.name;
      }
    }
    if (!formId) return err(`Form "${args.form_name}" không tìm thấy`);

    const form = await db
      .collection("form_templates")
      .findOne({ _id: new ObjectId(formId) });
    if (!form) return err("Form not found");

    const schema =
      typeof form.schema === "string" ? JSON.parse(form.schema) : form.schema;
    const allFields = (schema as any).fields ?? [];

    // Separate user-input fields from system-filled fields
    const fieldMeta: Record<string, { type: string; required: boolean; description?: string; autoFill: string; options?: string[] }> = {};
    const userFields: string[] = [];
    const systemFields: string[] = [];

    for (const f of allFields) {
      const autoFill = f.autoFill ?? "user";
      fieldMeta[f.label] = {
        type: f.type ?? "text",
        required: f.required ?? false,
        description: f.description,
        autoFill,
        options: f.options,
      };
      if (autoFill === "system") {
        systemFields.push(f.label);
      } else {
        userFields.push(f.label);
      }
    }

    // Load current session state
    const session = await db
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

    // Pre-fill fields that can be deduced from the current user context
    const preFilledData: Record<string, unknown> = {};
    const remainingUserFields: string[] = [];

    for (const label of userFields) {
      const meta = fieldMeta[label];
      const labelLower = label.toLowerCase();

      // Auto-fill "Tên SALES" (or any field whose label contains "sales") from logged-in user
      if (labelLower.includes("sales") && ctx.userName) {
        preFilledData[label] = ctx.userName;
        continue;
      }

      // Auto-fill today's date for date fields whose label contains "ngày" / "date" / "timestamp"
      if (
        meta?.type === "date" &&
        (labelLower.includes("ngày") || labelLower.includes("date") || labelLower.includes("timestamp"))
      ) {
        const now = new Date();
        preFilledData[label] = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
        continue;
      }

      remainingUserFields.push(label);
    }

    // Create form state — only user-input fields go to pendingFields
    const formState = {
      formName: form.name,
      formTemplateId: formId,
      status: "in_progress" as const,
      currentStep: 1 + Object.keys(preFilledData).length,
      totalSteps: userFields.length,
      data: preFilledData,
      pendingFields: remainingUserFields,
      fieldMeta,
      startedAt: Date.now(),
    };

    state.formState = formState;

    await db
      .collection("conversation_sessions")
      .updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { state, lastMessageAt: nowMs() } },
      );

    return ok({
      started: true,
      formName: form.name,
      totalSteps: formState.totalSteps,
      firstField: formState.pendingFields[0] ?? null,
      autoFilledFields: Object.entries(preFilledData).map(([label, value]) => ({ label, value })),
      systemFields: systemFields.map(label => ({
        label,
        description: fieldMeta[label]?.description,
      })),
      fieldMeta,
    });
  },
};
export default skill;
