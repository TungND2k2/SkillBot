import type { CollectionBeforeChangeHook } from "payload";

/**
 * Auto-advance status khi đã fill đủ field của bước hiện tại.
 *
 * Save → kiểm tra checklist bước hiện tại → đẩy sang bước tiếp.
 * User cứ điền dần dần là Order tự đi qua B1 → B2 → ... → done.
 *
 * Đồng thời tự stamp ngày duyệt (allowanceApprovedAt, embroideryApprovedAt,
 * sewingApprovedAt) khi checkbox vừa được tick — để track ai/khi nào duyệt.
 *
 * Logic ngầm: chỉ auto-advance lên 1 bước/lần save. Nếu user fill nhiều
 * bước cùng lúc thì lần save sau sẽ đẩy tiếp.
 */

interface OrderData {
  status?: string;
  // B1
  customer?: unknown;
  invoiceFile?: unknown;
  briefFile?: unknown;
  totalAmount?: number;
  expectedDeliveryDate?: string;
  // B2 — Định mức (link Sheet + manager tick)
  fabricSheetUrl?: string;
  allowanceApproved?: boolean;
  allowanceApprovedAt?: string;
  allowanceApprovedBy?: unknown;
  // B3 — Duyệt vải (1 ảnh)
  fabricCheckPhoto?: unknown;
  // B4 — Thêu (ảnh + sales tick)
  embroideryPhoto?: unknown;
  embroideryApproved?: boolean;
  embroideryApprovedAt?: string;
  // B5 — Hoàn thiện (ảnh + sales tick)
  sewingPhoto?: unknown;
  sewingApproved?: boolean;
  sewingApprovedAt?: string;
  // B6 — QC / ship
  qcShipPhoto?: unknown;
  deliveryDate?: string;
}

function pick<T>(data: Partial<T>, original: Partial<T> | null | undefined, key: keyof T): T[keyof T] | undefined {
  return data[key] ?? original?.[key];
}

function nonEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function isB1Complete(d: OrderData, o: OrderData): boolean {
  // Soft check: chỉ require các trường Sales tự điền được.
  const customer = pick(d, o, "customer");
  const invoice = pick(d, o, "invoiceFile");
  const brief = pick(d, o, "briefFile");
  const total = pick(d, o, "totalAmount");
  const deadline = pick(d, o, "expectedDeliveryDate");

  return (
    nonEmpty(customer) &&
    nonEmpty(invoice) &&
    nonEmpty(brief) &&
    nonEmpty(total) &&
    Number(total) > 0 &&
    nonEmpty(deadline)
  );
}

function isB2Complete(d: OrderData, o: OrderData): boolean {
  const sheet = pick(d, o, "fabricSheetUrl");
  const approved = pick(d, o, "allowanceApproved");
  return nonEmpty(sheet) && approved === true;
}

function isB3Complete(d: OrderData, o: OrderData): boolean {
  // Có ảnh vải duyệt là đủ.
  return nonEmpty(pick(d, o, "fabricCheckPhoto"));
}

function isB4Complete(d: OrderData, o: OrderData): boolean {
  // Có ảnh thêu + sales tick duyệt.
  const photo = pick(d, o, "embroideryPhoto");
  const approved = pick(d, o, "embroideryApproved");
  return nonEmpty(photo) && approved === true;
}

function isB5Complete(d: OrderData, o: OrderData): boolean {
  // Có ảnh hoàn thiện + sales tick duyệt.
  const photo = pick(d, o, "sewingPhoto");
  const approved = pick(d, o, "sewingApproved");
  return nonEmpty(photo) && approved === true;
}

function isB6Complete(d: OrderData, o: OrderData): boolean {
  // Có ảnh QC/đóng gói + ngày giao.
  return nonEmpty(pick(d, o, "qcShipPhoto")) && nonEmpty(pick(d, o, "deliveryDate"));
}

const ADVANCE_RULES: Array<{
  from: string;
  to: string;
  check: (d: OrderData, o: OrderData) => boolean;
}> = [
  { from: "b1", to: "b2", check: isB1Complete },
  { from: "b2", to: "b3", check: isB2Complete },
  { from: "b3", to: "b4", check: isB3Complete },
  { from: "b4", to: "b5", check: isB4Complete },
  { from: "b5", to: "b6", check: isB5Complete },
  { from: "b6", to: "done", check: isB6Complete },
];

/**
 * Khi checkbox approve vừa được tick (false → true) trong lần save này,
 * tự stamp ngày + user vào field *ApprovedAt / *ApprovedBy tương ứng.
 */
function stampApprovalDates(
  data: OrderData,
  original: OrderData,
  userId: string | undefined,
): void {
  const today = new Date().toISOString();
  // B2
  if (
    data.allowanceApproved === true &&
    !original.allowanceApproved &&
    !data.allowanceApprovedAt
  ) {
    data.allowanceApprovedAt = today;
    if (userId && !data.allowanceApprovedBy) data.allowanceApprovedBy = userId;
  }
  // B4
  if (
    data.embroideryApproved === true &&
    !original.embroideryApproved &&
    !data.embroideryApprovedAt
  ) {
    data.embroideryApprovedAt = today;
  }
  // B5
  if (
    data.sewingApproved === true &&
    !original.sewingApproved &&
    !data.sewingApprovedAt
  ) {
    data.sewingApprovedAt = today;
  }
}

export const autoAdvanceStage: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== "update") return data;
  const d = data as OrderData;
  const o = (originalDoc ?? {}) as OrderData;

  stampApprovalDates(d, o, (req?.user as { id?: string } | undefined)?.id);

  const current = d.status ?? o.status;
  // Manual override: nếu user đổi status sang giá trị khác (paused/cancelled
  // hoặc lùi bước), tôn trọng. Chỉ advance khi status đang ở từ b1-b6.
  const userChangedStatus = d.status !== undefined && d.status !== o.status;
  if (userChangedStatus) return data;

  const rule = ADVANCE_RULES.find((r) => r.from === current);
  if (!rule) return data;
  if (rule.check(d, o)) {
    d.status = rule.to;
  }
  return data;
};
