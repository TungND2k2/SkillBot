import type { ContextData } from "./context-builder.js";

/**
 * Build the full system prompt that is passed to the Claude Agent SDK
 * on every pipeline turn.
 *
 * Structure follows the "every word is load-bearing" principle:
 *  - XML tags for clear section boundaries (Claude-optimised)
 *  - Memory/context in the first 30% of prompt
 *  - Grounding anchors to prevent hallucination
 *  - Explicit scope boundaries and stop conditions
 */
export function buildSystemPrompt(
  ctx: ContextData,
  historyContext: string
): string {
  const {
    tenantName,
    tenantInstructions,
    userName,
    userRole,
    resourceSummary: r,
    activeWorkflow,
    activeForm,
  } = ctx;

  const blocks: string[] = [];

  // ── Identity (concise) ──────────────────────────────────────
  blocks.push(
    `<role>` +
    `You are the AI assistant for **${tenantName}**. ` +
    `You manage data, workflows, forms, and business processes via tool calls.` +
    `</role>`
  );

  // ── Memory block — first 30% of prompt ──────────────────────
  // Conversation history goes early so Claude weights it properly
  if (historyContext.trim()) {
    blocks.push(`<memory>\n${historyContext.trim()}\n</memory>`);
  }

  // ── Context: user + resources ───────────────────────────────
  const contextParts: string[] = [
    `User: ${userName} | Role: ${userRole}`,
  ];
  if (!activeForm) {
    contextParts.push(
      `Resources: ${r.collections} collections, ${r.workflows} workflows, ${r.forms} forms, ${r.rules} rules, ${r.crons} crons, ${r.docs} docs`
    );
  }
  blocks.push(`<context>\n${contextParts.join("\n")}\n</context>`);

  // ── Tenant custom instructions ──────────────────────────────
  if (tenantInstructions.trim()) {
    blocks.push(`<instructions>\n${tenantInstructions.trim()}\n</instructions>`);
  }

  // ── Active workflow ─────────────────────────────────────────
  if (activeWorkflow) {
    const stage = activeWorkflow.currentStageId ?? "initial";
    const formDataStr = Object.keys(activeWorkflow.formData).length
      ? JSON.stringify(activeWorkflow.formData, null, 2)
      : "none";

    blocks.push(
      `<active_workflow>\n` +
      `Template: "${activeWorkflow.templateName}" | Instance: ${activeWorkflow.id} | Stage: ${stage} | Status: ${activeWorkflow.status}\n` +
      `Data: ${formDataStr}\n` +
      `</active_workflow>`
    );
  }

  // ── Active form ─────────────────────────────────────────────
  if (activeForm) {
    const nextField = activeForm.pendingFields[0];
    const nextMeta = nextField ? activeForm.fieldMeta[nextField] : undefined;
    const collectedStr = Object.keys(activeForm.data).length
      ? JSON.stringify(activeForm.data, null, 2)
      : "none";

    // Remaining fields — compact list
    const pendingList = activeForm.pendingFields
      .map((f, i) => {
        const m = activeForm.fieldMeta[f];
        const tag = m?.required ? "[BẮT BUỘC]" : "[tùy chọn]";
        const desc = m?.description ? ` — ${m.description}` : "";
        const opts = m?.options?.length ? ` (${m.options.join(" / ")})` : "";
        return `  ${i + 1}. ${f} ${tag}${desc}${opts}`;
      })
      .join("\n");

    // Next action instruction
    let nextInstruction: string;
    if (!nextField) {
      nextInstruction = "All fields collected — call complete_form.";
    } else {
      // Find consecutive optional fields before next required
      const nextRequiredIdx = activeForm.pendingFields.findIndex(
        f => activeForm.fieldMeta[f]?.required
      );
      const optionalsBefore =
        nextRequiredIdx > 0
          ? activeForm.pendingFields.slice(0, nextRequiredIdx)
          : !activeForm.fieldMeta[nextField]?.required
          ? activeForm.pendingFields.filter(f => !activeForm.fieldMeta[f]?.required)
          : [];

      if (optionalsBefore.length > 1) {
        const optLabels = optionalsBefore.map(f => `${f}`).join(", ");
        nextInstruction =
          `Ask ALL optional fields in ONE message: ${optLabels}. If user skips, save null.`;
      } else {
        const isRequired = nextMeta?.required;
        const label = isRequired ? "Required" : "Optional";
        nextInstruction =
          `Next ${label}: ${nextField}${nextMeta?.description ? ` — ${nextMeta.description}` : ""}` +
          `${nextMeta?.options?.length ? ` (${nextMeta.options.join(" / ")})` : ""}`;
      }
    }

    blocks.push(
      `<active_form>\n` +
      `Form: "${activeForm.formName}" — step ${activeForm.currentStep}/${activeForm.totalSteps}\n` +
      `Collected: ${collectedStr}\n` +
      `Remaining:\n${pendingList}\n` +
      `→ ${nextInstruction}\n` +
      `</active_form>`
    );
  }

  // ── Constraints: what to do and NOT do ──────────────────────
  const constraints: string[] = [
    "Respond in the same language the user writes in",
    "Be concise — no filler, no emoji spam, no restating what user said",
    "Respect user role: only offer actions they can perform",
  ];

  if (activeForm) {
    constraints.push(
      "FORM RULES: call update_form_field BEFORE asking the next field",
      "Group consecutive optional fields into ONE question",
      "If user skips optional fields, save null and continue",
      "Follow the field order above — never ask user to pick which field",
    );
  }

  blocks.push(`<constraints>\n${constraints.map(c => `- ${c}`).join("\n")}\n</constraints>`);

  // ── Grounding anchors — anti-hallucination ──────────────────
  blocks.push(
    `<grounding>\n` +
    `- ONLY confirm an action (saved, created, deleted) when you receive a real tool result with an ID\n` +
    `- NEVER fabricate IDs, statuses, or claim data was saved without tool confirmation\n` +
    `- If a tool returns an error, report the error — do not pretend it succeeded\n` +
    `- If you are unsure whether something exists, use a tool to check first\n` +
    `</grounding>`
  );

  return blocks.join("\n\n");
}
