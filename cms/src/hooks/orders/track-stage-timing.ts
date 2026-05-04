import type { CollectionBeforeChangeHook, Payload } from "payload";

/**
 * Workflow integration hook cho Orders.
 *
 * Trên `create`:
 *   - stageStartedAt = now
 *   - remindersSent = []
 *   - Nếu order.workflow trống → auto-link Workflow có isDefault=true
 *   - Compute expectedStageEndAt = stageStartedAt + stage.durationDays
 *
 * Trên `update` (đổi status):
 *   - Reset stageStartedAt = now (vào bước mới lúc nào)
 *   - Reset remindersSent (cron sẽ gửi reminder của bước mới)
 *   - Recompute expectedStageEndAt theo durationDays của stage mới
 *
 * Lookup stage: (workflow, code=status). Nếu workflow null sau auto-link
 * (DB chưa có workflow nào isDefault), bỏ qua compute.
 */
export const trackStageTiming: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "create") {
    data.stageStartedAt = new Date().toISOString();
    data.remindersSent = [];

    // Auto-link default workflow nếu manager không chọn
    if (!data.workflow) {
      const wfId = await findDefaultWorkflowId(req.payload);
      if (wfId) data.workflow = wfId;
    }

    await computeExpectedEnd(req.payload, data);
    return data;
  }

  if (operation === "update") {
    const prev = originalDoc?.status as string | undefined;
    const next = data.status as string | undefined;
    if (prev && next && prev !== next) {
      data.stageStartedAt = new Date().toISOString();
      data.remindersSent = [];
      await computeExpectedEnd(req.payload, data, originalDoc);
    }
  }

  return data;
};

async function findDefaultWorkflowId(payload: Payload): Promise<string | null> {
  const res = await payload.find({
    collection: "workflows",
    where: { isDefault: { equals: true } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return res.docs.length > 0 ? String(res.docs[0].id) : null;
}

async function computeExpectedEnd(
  payload: Payload,
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown> | null,
): Promise<void> {
  const status =
    (data.status as string | undefined) ??
    (originalDoc?.status as string | undefined) ??
    "b1";

  const wfRef =
    (data.workflow as unknown) ?? (originalDoc?.workflow as unknown);
  const wfId =
    typeof wfRef === "string"
      ? wfRef
      : (wfRef as { id?: string | number } | null)?.id;
  if (!wfId) return;

  const stageRes = await payload.find({
    collection: "workflow-stages",
    where: {
      and: [
        { workflow: { equals: wfId } },
        { code: { equals: status } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const stage = stageRes.docs[0] as { durationDays?: number } | undefined;
  if (!stage?.durationDays || stage.durationDays <= 0) return;

  const startIso =
    (data.stageStartedAt as string | undefined) ??
    new Date().toISOString();
  const start = new Date(startIso);
  const end = new Date(start.getTime() + stage.durationDays * 86_400_000);
  data.expectedStageEndAt = end.toISOString();
}
