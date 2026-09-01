import type { CollectionBeforeChangeHook } from "payload";

const STAGE_ORDER = ["b1", "b2", "b3", "b4", "b5", "b6", "done"];

function nonEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function pick<T>(data: Partial<T>, original: Partial<T> | null | undefined, key: keyof T): T[keyof T] | undefined {
  return data[key] !== undefined ? data[key] : original?.[key];
}

/**
 * Strict Workflow Gate:
 * 1. Chỉ được chuyển bước khi bước trước hoàn thành (tuần tự B1 → B2 → B3 → B4 → B5 → B6 → Done).
 * 2. Mỗi bước phải có ảnh/file cập nhật HOẶC Quản lý tích xác nhận.
 * 3. Nếu Quản lý đã tích xác nhận -> Bỏ qua bắt buộc ảnh/file.
 */
export const validateOrderAdvance: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== "update") return data;

  const prevStatus = (originalDoc?.status as string) || "b1";
  const nextStatus = (data.status as string) || prevStatus;

  // Cho phép chuyển sang tạm dừng hoặc hủy bất kỳ lúc nào
  if (nextStatus === "paused" || nextStatus === "cancelled" || prevStatus === nextStatus) {
    return data;
  }

  const prevIdx = STAGE_ORDER.indexOf(prevStatus);
  const nextIdx = STAGE_ORDER.indexOf(nextStatus);

  // Không hợp lệ nếu mã trạng thái không nằm trong luồng
  if (prevIdx === -1 || nextIdx === -1) {
    return data;
  }

  // Chặn nhảy cóc (chỉ được tiến tối đa 1 bước, hoặc chuyển lùi nếu cần sửa đổi)
  if (nextIdx > prevIdx + 1) {
    throw new Error(
      `Không thể nhảy cóc từ bước ${prevStatus.toUpperCase()} sang ${nextStatus.toUpperCase()}. Quy trình yêu cầu hoàn thành tuần tự từng bước.`,
    );
  }

  // Kiểm tra điều kiện hoàn thành của bước hiện tại (prevStatus) trước khi cho phép tiến bước
  if (nextIdx === prevIdx + 1) {
    const errors: string[] = [];

    // ── B1: Nhận đơn & Đề bài ──
    if (prevStatus === "b1") {
      const b1ManagerConfirmed = Boolean(pick(data, originalDoc, "b1ManagerConfirmed" as any)) ||
                                Boolean(pick(data, originalDoc, "managerConfirmed" as any));

      if (!b1ManagerConfirmed) {
        const accountantConfirmed = Boolean(pick(data, originalDoc, "accountantConfirmed" as any));
        const hasInvoice = nonEmpty(pick(data, originalDoc, "invoiceFile" as any));
        const hasBrief = nonEmpty(pick(data, originalDoc, "briefFile" as any));
        const confVerify = pick(data, originalDoc, "confirmationVerified" as any);

        if (!accountantConfirmed) errors.push("Kế toán chưa xác nhận đặt cọc (hoặc Quản lý chưa duyệt)");
        if (!hasInvoice && !hasBrief) errors.push("Thiếu file Hóa đơn / Đề bài brief");
        if (confVerify !== "valid") errors.push("Chưa có ảnh xác nhận từ khách hàng");
      }
    }

    // ── B2: Định mức BOM vải ──
    if (prevStatus === "b2") {
      const b2ManagerConfirmed = Boolean(pick(data, originalDoc, "b2ManagerConfirmed" as any)) ||
                                Boolean(pick(data, originalDoc, "allowanceApproved" as any));
      const hasSheet = nonEmpty(pick(data, originalDoc, "fabricSheetUrl" as any));

      if (!b2ManagerConfirmed && !hasSheet) {
        errors.push("Chưa có bảng định mức BOM vải (hoặc Quản lý chưa tích duyệt)");
      }
    }

    // ── B3: Mua NPL & Duyệt vải ──
    if (prevStatus === "b3") {
      const b3ManagerConfirmed = Boolean(pick(data, originalDoc, "b3ManagerConfirmed" as any));
      const hasFabricPhoto = nonEmpty(pick(data, originalDoc, "fabricCheckPhoto" as any));

      if (!b3ManagerConfirmed && !hasFabricPhoto) {
        errors.push("Chưa có ảnh/phiếu nhập vải & NPL (hoặc Quản lý chưa tích duyệt)");
      }
    }

    // ── B4: Gửi NCC / Xưởng phụ trợ ──
    if (prevStatus === "b4") {
      const b4ManagerConfirmed = Boolean(pick(data, originalDoc, "b4ManagerConfirmed" as any));
      const hasSupplierPhoto = nonEmpty(pick(data, originalDoc, "supplierHandoverPhoto" as any)) ||
                               nonEmpty(pick(data, originalDoc, "embroideryPhoto" as any));

      if (!b4ManagerConfirmed && !hasSupplierPhoto) {
        errors.push("Chưa có ảnh bàn giao NCC / bắt đầu thêu (hoặc Quản lý chưa tích duyệt)");
      }
    }

    // ── B5: Thêu & May hoàn thiện ──
    if (prevStatus === "b5") {
      const b5ManagerConfirmed = Boolean(pick(data, originalDoc, "b5ManagerConfirmed" as any)) ||
                                (Boolean(pick(data, originalDoc, "embroideryApproved" as any)) &&
                                 Boolean(pick(data, originalDoc, "sewingApproved" as any)));
      const hasSewingPhoto = nonEmpty(pick(data, originalDoc, "sewingPhoto" as any)) ||
                             nonEmpty(pick(data, originalDoc, "embroideryPhoto" as any));

      if (!b5ManagerConfirmed && !hasSewingPhoto) {
        errors.push("Chưa có ảnh sản phẩm hoàn thiện (hoặc Quản lý chưa tích duyệt)");
      }
    }

    // ── B6: QC, Đóng gói & Giao hàng ──
    if (prevStatus === "b6") {
      const b6ManagerConfirmed = Boolean(pick(data, originalDoc, "b6ManagerConfirmed" as any));
      const hasQcPhoto = nonEmpty(pick(data, originalDoc, "qcShipPhoto" as any));

      if (!b6ManagerConfirmed && !hasQcPhoto) {
        errors.push("Chưa có ảnh QC / đóng gói xuất xưởng (hoặc Quản lý chưa tích duyệt)");
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Không thể chuyển bước ${prevStatus.toUpperCase()} → ${nextStatus.toUpperCase()}:\n  - ${errors.join("\n  - ")}`,
      );
    }
  }

  return data;
};
