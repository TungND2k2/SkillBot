import type { CollectionBeforeChangeHook } from "payload";

/**
 * Khi status (bước workflow) đổi → set `stageStartedAt = now` để các
 * cron reminder biết "đã ở bước này được bao nhiêu ngày".
 *
 * - operation `create`: luôn set stageStartedAt = now (đơn mới luôn bắt
 *   đầu từ B1)
 * - operation `update`: chỉ set lại khi `status` thực sự thay đổi
 *
 * Bonus: reset `remindersSent` khi chuyển bước — cron sẽ gửi reminder
 * mới của bước mới mà không bị miss.
 */
export const trackStageTiming: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === "create") {
    data.stageStartedAt = new Date().toISOString();
    data.remindersSent = [];
    return data;
  }

  if (operation === "update") {
    const prev = originalDoc?.status as string | undefined;
    const next = data.status as string | undefined;
    if (prev && next && prev !== next) {
      data.stageStartedAt = new Date().toISOString();
      data.remindersSent = []; // bước mới → cron gửi reminder mới
    }
  }

  return data;
};
