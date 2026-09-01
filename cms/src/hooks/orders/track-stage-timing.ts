import type { CollectionBeforeChangeHook } from "payload";
import { getStage } from "../../lib/workflow-stages";

export const trackStageTiming: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const now = new Date();
  const userId = req.user?.id;

  // 1. Tự động tính Ngày trả hàng dự kiến (expectedDeliveryDate) theo TAT nếu chưa có
  if (!data.expectedDeliveryDate && !originalDoc?.expectedDeliveryDate) {
    const orderDateIso = (data.orderDate as string) || (originalDoc?.orderDate as string) || now.toISOString();
    const orderDate = new Date(orderDateIso);
    // Tổng TAT tiêu chuẩn sản xuất may thêu: 35 ngày
    data.expectedDeliveryDate = new Date(orderDate.getTime() + 35 * 86_400_000).toISOString();
  }

  // 2. Xử lý khi Tạo đơn mới (operation === "create")
  if (operation === "create") {
    data.stageStartedAt = now.toISOString();
    data.remindersSent = [];
    computeExpectedEnd(data);

    // Khởi tạo nhật ký công đoạn
    data.stageTimings = [
      {
        stage: data.status || "b1",
        startedAt: now.toISOString(),
        updatedBy: userId,
        managerConfirmed: Boolean(data.managerConfirmed || data.b1ManagerConfirmed),
        notes: "Khởi tạo đơn hàng",
      },
    ];

    return data;
  }

  // 3. Xử lý khi Cập nhật đổi trạng thái (operation === "update")
  if (operation === "update") {
    const prevStatus = (originalDoc?.status as string) || "b1";
    const nextStatus = (data?.status as string) || prevStatus;

    if (prevStatus !== nextStatus) {
      data.stageStartedAt = now.toISOString();
      data.remindersSent = [];
      computeExpectedEnd(data, originalDoc);

      // Cập nhật mảng stageTimings lưu vết người làm + ngày bắt đầu/kết thúc
      const existingTimings = Array.isArray(originalDoc?.stageTimings)
        ? [...originalDoc.stageTimings]
        : [];

      // Đóng dấu ngày hoàn thành cho bước trước
      if (existingTimings.length > 0) {
        const lastIdx = existingTimings.length - 1;
        if (!existingTimings[lastIdx].completedAt) {
          existingTimings[lastIdx].completedAt = now.toISOString();
        }
      }

      const recordData = data as Record<string, unknown>;
      existingTimings.push({
        stage: nextStatus,
        startedAt: now.toISOString(),
        updatedBy: userId,
        managerConfirmed: Boolean(
          recordData[`${nextStatus}ManagerConfirmed`] || recordData.managerConfirmed,
        ),
      });

      data.stageTimings = existingTimings;
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
