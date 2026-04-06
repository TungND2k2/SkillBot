import { ObjectId } from "mongodb";
import type { DbInstance } from "../db/connection.js";

// ── Types ────────────────────────────────────────────────────

export interface ActiveWorkflowInfo {
  id: string;
  templateName: string;
  currentStageId: string | null;
  status: string;
  formData: Record<string, unknown>;
}

export interface ActiveFormInfo {
  formName: string;
  currentStep: number;
  totalSteps: number;
  pendingFields: string[];
  data: Record<string, unknown>;
  fieldMeta: Record<string, { type: string; required: boolean; description?: string; autoFill: string; options?: string[] }>;
}

export interface ResourceSummary {
  collections: number;
  workflows: number;
  forms: number;
  rules: number;
  crons: number;
  docs: number;
}

export interface ContextData {
  tenantId: string;
  tenantName: string;
  tenantInstructions: string;
  aiConfig: Record<string, unknown>;
  userId: string;
  userName: string;
  userRole: string;
  sessionId: string;
  activeWorkflow: ActiveWorkflowInfo | undefined;
  activeForm: ActiveFormInfo | undefined;
  resourceSummary: ResourceSummary;
}

// ── Builder ──────────────────────────────────────────────────

/**
 * Loads all data needed to build the system prompt for one pipeline turn.
 * Runs DB queries in parallel where possible.
 */
export async function buildContext(
  db: DbInstance,
  tenantId: string,
  userId: string,
  userName: string,
  userRole: string,
  sessionId: string,
  activeInstanceId: string | null | undefined,
  rawFormState?: Record<string, unknown> | undefined
): Promise<ContextData> {
  const coll = db.collection.bind(db);
  const [tenant, colCount, wfCount, formCount, ruleCount, cronCount, docCount] =
    await Promise.all([
      coll("tenants").findOne({ _id: new ObjectId(tenantId) }),
      coll("collections").countDocuments({ tenantId }),
      coll("workflow_templates").countDocuments({ tenantId }),
      coll("form_templates").countDocuments({ tenantId }),
      coll("business_rules").countDocuments({ tenantId, status: "active" }),
      coll("cron_jobs").countDocuments({ tenantId, status: "active" }),
      coll("bot_docs").countDocuments({ tenantId }),
    ]);

  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  let activeWorkflow: ActiveWorkflowInfo | undefined;
  if (activeInstanceId) {
    const instance = await db.collection("workflow_instances").findOne({
      _id: new ObjectId(activeInstanceId), tenantId, status: "active",
    });
    if (instance) {
      const template = await db.collection("workflow_templates").findOne({ _id: new ObjectId(String(instance.templateId)) });
      if (template) {
        activeWorkflow = {
          id: String(instance._id),
          templateName: template.name,
          currentStageId: instance.currentStageId,
          status: instance.status,
          formData: (instance.formData ?? {}) as Record<string, unknown>,
        };
      }
    }
  }

  // Build active form info from session state
  let activeForm: ActiveFormInfo | undefined;
  if (
    rawFormState &&
    rawFormState.status === "in_progress" &&
    Array.isArray(rawFormState.pendingFields) &&
    (rawFormState.pendingFields as string[]).length > 0
  ) {
    activeForm = {
      formName: String(rawFormState.formName ?? ""),
      currentStep: Number(rawFormState.currentStep ?? 1),
      totalSteps: Number(rawFormState.totalSteps ?? 0),
      pendingFields: rawFormState.pendingFields as string[],
      data: (rawFormState.data ?? {}) as Record<string, unknown>,
      fieldMeta: (rawFormState.fieldMeta ?? {}) as ActiveFormInfo["fieldMeta"],
    };
  }

  return {
    tenantId,
    tenantName: tenant.name,
    tenantInstructions: tenant.instructions,
    aiConfig: (tenant.aiConfig ?? {}) as Record<string, unknown>,
    userId,
    userName,
    userRole,
    sessionId,
    activeWorkflow,
    activeForm,
    resourceSummary: {
      collections: colCount,
      workflows: wfCount,
      forms: formCount,
      rules: ruleCount,
      crons: cronCount,
      docs: docCount,
    },
  };
}
