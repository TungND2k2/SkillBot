import type { CollectionBeforeChangeHook } from "payload";

/**
 * Auto-advance status khi đã fill đủ field của bước hiện tại.
 *
 * Save → kiểm tra checklist bước hiện tại → đẩy sang bước tiếp.
 * Manager cứ điền dần dần là Order tự đi qua B1 → B2 → ... → done.
 *
 * Logic ngầm: chỉ auto-advance lên 1 bước/lần save (nếu user đột nhiên
 * điền cả B2+B3 cùng lúc thì lần save sau sẽ đẩy tiếp). Tránh nhảy 2-3
 * bước khó tracking.
 */

interface OrderData {
  status?: string;
  // B1
  customer?: unknown;
  invoiceFile?: unknown;
  briefFile?: unknown;
  totalAmount?: number;
  accountantConfirmed?: boolean;
  confirmationVerified?: string;
  expectedDeliveryDate?: string;
  documentMatch?: { status?: string; salesConfirmedMismatch?: boolean };
  // B2
  fabricAllowances?: unknown[];
  allowanceApprovedBy?: unknown;
  // B3
  purchaseReceivedAt?: string;
  // B4
  supplierBriefSentAt?: string;
  // B5
  productionStartedAt?: string;
  embroideryUpdates?: unknown[];
  sewingUpdates?: unknown[];
  // B6
  qcResult?: string;
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
  // Soft check: chỉ require các trường Sales tự điền được. Các flag AI
  // (documentMatch, confirmationVerified) là quality check optional —
  // không gate workflow. accountantConfirmed cũng optional cho dev nhẹ;
  // KT có thể tick sau, không chặn quy trình.
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
  const allowances = pick(d, o, "fabricAllowances");
  const approver = pick(d, o, "allowanceApprovedBy");
  return Array.isArray(allowances) && allowances.length > 0 && nonEmpty(approver);
}

function isB3Complete(d: OrderData, o: OrderData): boolean {
  return nonEmpty(pick(d, o, "purchaseReceivedAt"));
}

function isB4Complete(d: OrderData, o: OrderData): boolean {
  return nonEmpty(pick(d, o, "supplierBriefSentAt"));
}

function isB5Complete(d: OrderData, o: OrderData): boolean {
  const start = pick(d, o, "productionStartedAt");
  const emb = (pick(d, o, "embroideryUpdates") as unknown[] | undefined) ?? [];
  const sew = (pick(d, o, "sewingUpdates") as unknown[] | undefined) ?? [];
  return nonEmpty(start) && (emb.length > 0 || sew.length > 0);
}

function isB6Complete(d: OrderData, o: OrderData): boolean {
  return pick(d, o, "qcResult") === "pass" && nonEmpty(pick(d, o, "deliveryDate"));
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

export const autoAdvanceStage: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== "update") return data;
  const d = data as OrderData;
  const o = (originalDoc ?? {}) as OrderData;

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
