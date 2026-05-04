import type { CollectionBeforeChangeHook } from "payload";
import { getStage } from "../../lib/workflow-stages";

/**
 * Workflow timing hook — đọc STAGES constant (không query DB).
 *
 * Trên `create`: stageStartedAt = now, expectedStageEndAt = now + durationDays
 * Trên `update` (đổi status): reset cả 2 + clear remindersSent
 */
export const trackStageTiming: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === "create") {
    data.stageStartedAt = new Date().toISOString();
    data.remindersSent = [];
    computeExpectedEnd(data);
    return data;
  }

  if (operation === "update") {
    const prev = originalDoc?.status as string | undefined;
    const next = data?.status as string | undefined;
    if (prev && next && prev !== next) {
      data.stageStartedAt = new Date().toISOString();
      data.remindersSent = [];
      computeExpectedEnd(data, originalDoc);
    }
  }
  return data;
};

function computeExpectedEnd(
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown> | null,
): void {
  const status =
    (data.status as string | undefined) ??
    (originalDoc?.status as string | undefined) ??
    "b1";

  const stage = getStage(status);
  if (!stage || !stage.durationDays || stage.durationDays <= 0) return;

  const startIso =
    (data.stageStartedAt as string | undefined) ?? new Date().toISOString();
  const start = new Date(startIso);
  data.expectedStageEndAt = new Date(
    start.getTime() + stage.durationDays * 86_400_000,
  ).toISOString();
}
