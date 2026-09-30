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
      if (!on("accountantConfirmed")) out.push("B1 – kế toán chưa tích «Kế toán đã nhận cọc» (tab B1 › Dòng tiền & Tài chính)");
      if (!has("invoiceFile") && !has("briefFile")) out.push("B1 – thiếu file Hoá đơn / Đề bài (tab B1 › Hoá đơn & Đề bài kỹ thuật)");
      if (get("confirmationVerified") !== "valid") out.push("B1 – chưa có ảnh khách xác nhận hợp lệ (tab B1 › Xác nhận khách hàng)");
      return out;
    }
    case "b2":
      return on("b2ManagerConfirmed") || on("allowanceApproved") || has("fabricSheetUrl")
        ? []
        : ["B2 – thiếu link bảng định mức (tab Tiến độ › mục 1 Định mức vải)"];
    case "b3":
      return on("b3ManagerConfirmed") || has("fabricCheckPhoto")
        ? []
        : ["B3 – thiếu ảnh vải đã mua (tab Tiến độ › mục 2 Duyệt vải – chỉ hiện khi đơn đã ở B3)"];
    case "b4":
      return on("b4ManagerConfirmed") || has("supplierHandoverPhoto") || has("embroideryPhoto")
        ? []
        : ["B4 – thiếu ảnh thêu (tab Tiến độ › mục 3 Ảnh thêu – chỉ hiện khi đơn đã ở B4)"];
    case "b5":
      return on("b5ManagerConfirmed") ||
        (on("embroideryApproved") && on("sewingApproved")) ||
        has("sewingPhoto") ||
        has("embroideryPhoto")
        ? []
        : ["B5 – thiếu ảnh hoàn thiện (tab Tiến độ › mục 4 Ảnh hoàn thiện – chỉ hiện khi đơn đã ở B5)"];
    case "b6":
      return on("b6ManagerConfirmed") || has("qcShipPhoto") ? [] : ["B6 – thiếu ảnh QC / đóng gói (tab Tiến độ › mục 5 QC – chỉ hiện khi đơn đã ở B6)"];
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
    // Định dạng "<intro>: <mục>, <mục>" — toast của Payload tách ở dấu ":" đầu
    // tiên rồi tách bullet theo dấu "," nên mỗi mục KHÔNG được chứa ":" hay ",".
    const skipped = STAGE_ORDER.slice(prevIdx, nextIdx).map((s) => `«Xong ${s.toUpperCase()}»`).join(" + ");
    throw new APIError(
      `Chưa chuyển được ${prevStatus.toUpperCase()} → ${nextStatus.toUpperCase()}: ` +
        [...errors, `Cách nhanh – Quản lý tích ${skipped} ở cột phải rồi Lưu`].join(", "),
      400,
      null,
      true,
    );
  }

  return data;
};
