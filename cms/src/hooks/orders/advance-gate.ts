import type { CollectionBeforeChangeHook } from "payload";

/**
 * Workflow gate: ngăn đơn chuyển từ B1 → B2 nếu chưa đủ điều kiện.
 *
 * Theo guide:
 *  1. Kế toán xác nhận đặt cọc (`accountantConfirmed`)
 *  2. Hóa đơn vs đề bài match (hoặc sales đã cam kết mismatch)
 *  3. Có ảnh xác nhận từ khách (`confirmationVerified === "valid"`)
 *
 * Nếu thiếu → throw error, Payload trả 400 cho client với message rõ ràng.
 */
export const validateOrderAdvance: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== "update") return data;

  const wasInB1 = (originalDoc?.status as string | undefined) === "b1";
  const movingToB2OrLater = data.status && data.status !== "b1" && data.status !== "paused" && data.status !== "cancelled";
  if (!wasInB1 || !movingToB2OrLater) return data;

  const errors: string[] = [];

  if (!data.accountantConfirmed && !originalDoc?.accountantConfirmed) {
    errors.push("Kế toán chưa xác nhận đặt cọc");
  }

  const docMatch =
    (data.documentMatch?.status as string | undefined) ??
    (originalDoc?.documentMatch?.status as string | undefined);
  const salesConfirmed =
    Boolean(data.documentMatch?.salesConfirmedMismatch) ||
    Boolean(originalDoc?.documentMatch?.salesConfirmedMismatch);

  if (docMatch === "rejected") {
    errors.push("Hóa đơn vs đề bài không khớp (status: rejected)");
  } else if (docMatch === "warning" && !salesConfirmed) {
    errors.push("Hóa đơn vs đề bài có cảnh báo, cần Sales cam kết trước");
  } else if (docMatch === "pending" || !docMatch) {
    errors.push("Chưa kiểm tra match hóa đơn vs đề bài");
  }

  const confVerify =
    (data.confirmationVerified as string | undefined) ??
    (originalDoc?.confirmationVerified as string | undefined);
  if (confVerify !== "valid") {
    errors.push("Chưa có ảnh xác nhận hợp lệ từ khách hàng");
  }

  if (errors.length > 0) {
    throw new Error(
      `Không thể chuyển sang ${data.status}:\n  - ${errors.join("\n  - ")}`,
    );
  }

  return data;
};
