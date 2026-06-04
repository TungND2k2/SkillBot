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
    name: "Định mức vải",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 2,
    responsibleRole: "input",
    reminderRoles: ["input", "manager"],
    description:
      "Input dán link Google Sheet bảng định mức vải; Manager duyệt bằng cách tick checkbox.",
  },
  {
    code: "b3",
    order: 3,
    name: "Duyệt vải",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 5,
    responsibleRole: "input",
    reminderRoles: ["input", "manager"],
    description:
      "Input upload ảnh duyệt vải (đã chọn xong vải / mẫu vải khớp đề bài).",
  },
  {
    code: "b4",
    order: 4,
    name: "Ảnh thêu",
    durationDays: 15,
    minDurationDays: 10,
    maxDurationDays: 20,
    responsibleRole: "input",
    reminderRoles: ["input", "manager", "salesperson"],
    description:
      "Input upload ảnh thêu cập nhật; Sales duyệt bằng cách tick.",
  },
  {
    code: "b5",
    order: 5,
    name: "Ảnh hoàn thiện",
    durationDays: 10,
    minDurationDays: 7,
    maxDurationDays: 15,
    responsibleRole: "input",
    reminderRoles: ["input", "manager", "salesperson"],
    description:
      "Input upload ảnh hoàn thiện (may xong); Sales duyệt bằng cách tick.",
  },
  {
    code: "b6",
    order: 6,
    name: "QC & Đóng gói ship",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 4,
    responsibleRole: "salesperson",
    reminderRoles: ["salesperson", "manager"],
    description:
      "Sales upload ảnh QC + đóng gói + ship. Đơn coi như hoàn tất khi có ảnh + ngày giao.",
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
