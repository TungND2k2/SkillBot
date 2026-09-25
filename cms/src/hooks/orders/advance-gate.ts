import { APIError, type CollectionBeforeChangeHook } from "payload";

const STAGE_ORDER = ["b1", "b2", "b3", "b4", "b5", "b6", "done"];

function nonEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

type Doc = Record<string, unknown>;

/**
 * Lý do bước `stage` CHƯA hoàn thành (mảng rỗng = đã xong).
 * Mỗi bước xong khi có ảnh/file bằng chứng HOẶC Quản lý tích duyệt bước đó.
 */
function stageIssues(stage: string, get: (k: string) => unknown): string[] {
  const has = (k: string) => nonEmpty(get(k));
  const on = (k: string) => Boolean(get(k));
  switch (stage) {
    case "b1": {
      if (on("b1ManagerConfirmed")) return [];
      const out: string[] = [];
      if (!on("accountantConfirmed")) out.push("B1: Kế toán chưa xác nhận đặt cọc");
      if (!has("invoiceFile") && !has("briefFile")) out.push("B1: Thiếu file Hóa đơn / Đề bài");
      if (get("confirmationVerified") !== "valid") out.push("B1: Chưa có ảnh xác nhận hợp lệ từ khách");
      return out;
    }
    case "b2":
      return on("b2ManagerConfirmed") || on("allowanceApproved") || has("fabricSheetUrl")
        ? []
        : ["B2: Chưa có bảng định mức BOM vải"];
    case "b3":
      return on("b3ManagerConfirmed") || has("fabricCheckPhoto")
        ? []
        : ["B3: Chưa có ảnh/phiếu nhập vải & NPL"];
    case "b4":
      return on("b4ManagerConfirmed") || has("supplierHandoverPhoto") || has("embroideryPhoto")
        ? []
        : ["B4: Chưa có ảnh bàn giao NCC / bắt đầu thêu"];
    case "b5":
      return on("b5ManagerConfirmed") ||
        (on("embroideryApproved") && on("sewingApproved")) ||
        has("sewingPhoto") ||
        has("embroideryPhoto")
        ? []
        : ["B5: Chưa có ảnh sản phẩm hoàn thiện"];
    case "b6":
      return on("b6ManagerConfirmed") || has("qcShipPhoto") ? [] : ["B6: Chưa có ảnh QC / đóng gói"];
    default:
      return [];
  }
}

/**
 * Workflow gate:
 * - Tiến bước chỉ khi MỌI bước đang rời qua (từ bước hiện tại tới trước bước
 *   đích) đã hoàn thành: có ảnh/file, hoặc Quản lý tích "Duyệt Bx".
 *   → Được nhảy nhiều bước nếu các bước giữa đều đạt (vd tích Duyệt B2 + B3
 *   rồi chuyển B2 → B4).
 * - "Duyệt toàn bộ (Master Override)" bỏ qua mọi điều kiện.
 * - Lùi bước, tạm dừng, huỷ: luôn cho phép.
 *
 * Lỗi ném APIError 400 để admin hiện đúng nội dung (Error thường → Payload
 * trả 500 "Something went wrong").
 */
export const validateOrderAdvance: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  if (operation !== "update") return data;

  const prevStatus = (originalDoc?.status as string) || "b1";
  const nextStatus = (data.status as string) || prevStatus;
  if (nextStatus === "paused" || nextStatus === "cancelled" || prevStatus === nextStatus) return data;

  const prevIdx = STAGE_ORDER.indexOf(prevStatus);
  const nextIdx = STAGE_ORDER.indexOf(nextStatus);
  if (prevIdx === -1 || nextIdx === -1 || nextIdx < prevIdx) return data;

  const get = (k: string) => ((data as Doc)[k] !== undefined ? (data as Doc)[k] : (originalDoc as Doc | undefined)?.[k]);
  if (get("managerConfirmed")) return data;

  const errors = STAGE_ORDER.slice(prevIdx, nextIdx).flatMap((s) => stageIssues(s, get));
  if (errors.length > 0) {
    throw new APIError(
      `Không thể chuyển ${prevStatus.toUpperCase()} → ${nextStatus.toUpperCase()}. ` +
        `${errors.join("; ")}. Bổ sung ảnh/file, hoặc Quản lý tích "Duyệt" các bước này (hoặc "Duyệt toàn bộ").`,
      400,
      null,
      true,
    );
  }

  return data;
};
