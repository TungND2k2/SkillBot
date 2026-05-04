/**
 * Quy trình B1 → B6 — single source of truth.
 *
 * Thay vì lưu trong 2 collection Workflows + WorkflowStages (manager phải
 * config trước khi dùng), ta hard-code ở đây. UI admin chỉ display, không
 * cho edit. Khi cần thêm bước hoặc đổi durationDays → sửa file này, deploy.
 *
 * Bot cron + bot tools đọc constant này (qua /api/workflow-stages giả lập
 * không cần — đọc trực tiếp).
 */

export const STAGE_CODES = [
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "done",
  "paused",
  "cancelled",
] as const;

export type StageCode = (typeof STAGE_CODES)[number];

export interface StageDef {
  code: StageCode;
  order: number;
  name: string;
  /** Mặc định mất bao nhiêu ngày — dùng để tính expectedStageEndAt + nhắc trễ */
  durationDays: number;
  /** Tối thiểu/tối đa ngày — chỉ dùng để show user "khoảng thời gian" */
  minDurationDays?: number;
  maxDurationDays?: number;
  /** Role chính chịu trách nhiệm bước này */
  responsibleRole: string;
  /** Role được nhắc qua Telegram khi bước trễ */
  reminderRoles: string[];
  /** Mô tả ngắn cho UI quy trình */
  description: string;
}

/**
 * Các bước active (đơn đang chạy). `done`/`paused`/`cancelled` là terminal,
 * không có duration + không nhắc.
 */
export const STAGES: StageDef[] = [
  {
    code: "b1",
    order: 1,
    name: "Nhận đơn",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 2,
    responsibleRole: "salesperson",
    reminderRoles: ["salesperson", "manager"],
    description:
      "Sales nhận đề bài, xác nhận thiết kế, size, SL, NPL, deadline. Hoá đơn + đề bài phải khớp, có ảnh xác nhận khách + kế toán confirm cọc.",
  },
  {
    code: "b2",
    order: 2,
    name: "Tính định mức",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 2,
    responsibleRole: "planner",
    reminderRoles: ["planner", "manager"],
    description:
      "Tính định mức vải chính / vải phụ / NPL theo m/pcs. Output: bảng định mức + tổng vải cần mua. Manager duyệt.",
  },
  {
    code: "b3",
    order: 3,
    name: "Mua nguyên liệu",
    durationDays: 7,
    minDurationDays: 5,
    maxDurationDays: 10,
    responsibleRole: "planner",
    reminderRoles: ["planner", "manager", "accountant"],
    description:
      "Kiểm kho → list mua → bảng kê chi phí (manager duyệt) → toa NPL (kế toán lưu). Khi nhận: kiểm màu, chất, lỗi vải.",
  },
  {
    code: "b4",
    order: 4,
    name: "Gửi đề bài NCC",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 5,
    responsibleRole: "planner",
    reminderRoles: ["planner"],
    description:
      "Gửi đề bài đầy đủ cho NCC: thiết kế, vải (woven/knit), thêu, NPL, lining, deadline. Mẫu lạ làm 1 mẫu duyệt trước.",
  },
  {
    code: "b5",
    order: 5,
    name: "Sản xuất (Thêu + May)",
    durationDays: 25,
    minDurationDays: 22,
    maxDurationDays: 35,
    responsibleRole: "supplier",
    reminderRoles: ["planner", "manager"],
    description:
      "NCC cắt vải → thêu (15-20 ngày, sau 1 tuần phải có ảnh cập nhật) → may (10-15 ngày, sau 4 tuần phải có ảnh).",
  },
  {
    code: "b6",
    order: 6,
    name: "QC & Đóng gói giao hàng",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 4,
    responsibleRole: "qc",
    reminderRoles: ["qc", "manager"],
    description:
      "QC checklist 7 hạng mục: không bẩn, form chuẩn, smock đều, không chỉ thừa, không nhăn, size đúng, mác đúng. Đóng gói chia size, dán sticker.",
  },
];

/** Return định nghĩa stage theo code, hoặc null nếu code không hợp lệ. */
export function getStage(code: string | undefined): StageDef | null {
  return STAGES.find((s) => s.code === code) ?? null;
}

/** Return list code các bước đang chạy (loại trừ done/paused/cancelled). */
export const ACTIVE_STAGE_CODES = STAGES.map((s) => s.code);

/** Order options cho UI dropdown — bao gồm cả terminal states. */
export const STATUS_SELECT_OPTIONS = [
  ...STAGES.map((s) => ({
    label: `${s.code.toUpperCase()} — ${s.name}`,
    value: s.code,
  })),
  { label: "✅ Hoàn thành", value: "done" as StageCode },
  { label: "⏸ Tạm dừng", value: "paused" as StageCode },
  { label: "❌ Huỷ", value: "cancelled" as StageCode },
];
