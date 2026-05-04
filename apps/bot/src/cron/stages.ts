/**
 * Mirror của `cms/src/lib/workflow-stages.ts` — bot dùng để biết
 * stage info mà không cần gọi Payload API.
 *
 * Khi sửa stage → sửa CẢ HAI file để giữ đồng bộ. (Đáng lẽ
 * có thể share package nhưng monorepo setup chưa đủ.)
 */

export interface ReminderConfig {
  /** Sau bao nhiêu ngày kể từ stageStartedAt */
  atDay: number;
  /** Roles để DM Telegram */
  recipients: string[];
  /** Loại nhắc */
  kind: "checkin" | "overdue" | "critical";
  /** Template message — hỗ trợ {orderCode}, {customer}, {daysSinceStart}, {daysOverdue}, {stage} */
  message: string;
}

export interface StageDef {
  code: string;
  order: number;
  name: string;
  durationDays: number;
  responsibleRole: string;
  reminders: ReminderConfig[];
}

export const STAGES: StageDef[] = [
  {
    code: "b1",
    order: 1,
    name: "Nhận đơn",
    durationDays: 1,
    responsibleRole: "salesperson",
    reminders: [
      {
        atDay: 1,
        recipients: ["salesperson", "manager"],
        kind: "overdue",
        message:
          "⚠️ Đơn {orderCode} ({customer}) đang ở B1 đã {daysSinceStart} ngày. Cần đẩy sang B2 — kiểm tra hoá đơn, đề bài, ảnh xác nhận, kế toán confirm.",
      },
    ],
  },
  {
    code: "b2",
    order: 2,
    name: "Tính định mức",
    durationDays: 1,
    responsibleRole: "planner",
    reminders: [
      {
        atDay: 1,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "📋 Đơn {orderCode}: cần tính định mức và trình quản lý duyệt hôm nay.",
      },
      {
        atDay: 2,
        recipients: ["manager", "admin"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B2 quá {daysOverdue} ngày — định mức chưa duyệt.",
      },
    ],
  },
  {
    code: "b3",
    order: 3,
    name: "Mua nguyên liệu",
    durationDays: 7,
    responsibleRole: "planner",
    reminders: [
      {
        atDay: 5,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "📦 Đơn {orderCode}: B3 đã {daysSinceStart} ngày. Cập nhật tiến độ NCC.",
      },
      {
        atDay: 8,
        recipients: ["manager", "admin"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B3 quá {daysOverdue} ngày — nguyên liệu chưa về đủ.",
      },
    ],
  },
  {
    code: "b4",
    order: 4,
    name: "Gửi đề bài NCC",
    durationDays: 2,
    responsibleRole: "planner",
    reminders: [
      {
        atDay: 1,
        recipients: ["planner"],
        kind: "checkin",
        message: "📤 Đơn {orderCode}: gửi đề bài NCC + xác nhận deadline.",
      },
      {
        atDay: 3,
        recipients: ["manager"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B4 quá {daysOverdue} ngày — NCC chưa xác nhận?",
      },
    ],
  },
  {
    code: "b5",
    order: 5,
    name: "Sản xuất",
    durationDays: 25,
    responsibleRole: "supplier",
    reminders: [
      {
        atDay: 7,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "🧵 Đơn {orderCode}: 1 tuần ở B5 — cần ảnh cập nhật thêu từ NCC.",
      },
      {
        atDay: 28,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "✂️ Đơn {orderCode}: 4 tuần — cần ảnh cập nhật may từ NCC.",
      },
      {
        atDay: 35,
        recipients: ["manager", "admin"],
        kind: "critical",
        message: "🚨 Đơn {orderCode} đã trễ B5 {daysOverdue} ngày — cần can thiệp.",
      },
    ],
  },
  {
    code: "b6",
    order: 6,
    name: "QC & Giao hàng",
    durationDays: 2,
    responsibleRole: "qc",
    reminders: [
      {
        atDay: 1,
        recipients: ["qc"],
        kind: "checkin",
        message: "🔍 Đơn {orderCode}: tiến hành QC final + chuẩn bị giao hàng.",
      },
      {
        atDay: 3,
        recipients: ["manager"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B6 quá {daysOverdue} ngày — QC/đóng gói chưa xong.",
      },
    ],
  },
];

export const ACTIVE_STAGE_CODES = STAGES.map((s) => s.code);

export function getStage(code: string | undefined): StageDef | null {
  return STAGES.find((s) => s.code === code) ?? null;
}
