/**
 * Quy trình B1 → B6 & Logic TAT — Single Source of Truth cho toàn hệ thống.
 *
 * Flow:
 * B1 Nhận đơn → B2 Định mức 1–4 ngày → B3 Mua NPL 3–7 ngày →
 * B4 Gửi NCC 1 ngày → B5 Thêu 14–21 ngày & May 10–14 ngày (Tổng: 24–35 ngày) →
 * B6 QC/Đóng gói 1–3 ngày → Giao hàng.
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
  durationDays: number;
  minDurationDays: number;
  maxDurationDays: number;
  responsibleRole: string;
  reminderRoles: string[];
  description: string;
}

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
      "Sales nhận đề bài, xác nhận thiết kế, size, SL, NPL, deadline. Hoá đơn + đề bài phải khớp, có ảnh xác nhận khách hoặc Quản lý duyệt.",
  },
  {
    code: "b2",
    order: 2,
    name: "Định mức BOM",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 4,
    responsibleRole: "input",
    reminderRoles: ["input", "manager"],
    description:
      "Tính định mức vải và nguyên phụ liệu (1–4 ngày). Cần link/file bảng định mức hoặc Quản lý tích duyệt.",
  },
  {
    code: "b3",
    order: 3,
    name: "Mua NPL",
    durationDays: 5,
    minDurationDays: 3,
    maxDurationDays: 7,
    responsibleRole: "input",
    reminderRoles: ["input", "manager"],
    description:
      "Mua nguyên phụ liệu và duyệt vải nhập kho (3–7 ngày). Cần ảnh/phiếu nhập hoặc Quản lý tích duyệt.",
  },
  {
    code: "b4",
    order: 4,
    name: "Gửi NCC",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 1,
    responsibleRole: "input",
    reminderRoles: ["input", "manager"],
    description:
      "Bàn giao đơn hàng và bán thành phẩm cho Nhà cung cấp/Xưởng phụ trợ (1 ngày).",
  },
  {
    code: "b5",
    order: 5,
    name: "Thêu & May",
    durationDays: 28,
    minDurationDays: 24,
    maxDurationDays: 35,
    responsibleRole: "input",
    reminderRoles: ["input", "manager", "salesperson"],
    description:
      "Thêu bán thành phẩm (14–21 ngày) và May ráp hoàn thiện (10–14 ngày). Cần ảnh thêu + ảnh may hoặc Quản lý tích duyệt.",
  },
  {
    code: "b6",
    order: 6,
    name: "QC & Đóng gói",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 3,
    responsibleRole: "salesperson",
    reminderRoles: ["salesperson", "manager"],
    description:
      "Kiểm định chất lượng KCS, đóng gói và xuất hàng (1–3 ngày). Cần ảnh QC hoặc Quản lý tích duyệt.",
  },
];

export function getStage(code: string | undefined): StageDef | null {
  return STAGES.find((s) => s.code === code) ?? null;
}

export const ACTIVE_STAGE_CODES = STAGES.map((s) => s.code);

export const STATUS_SELECT_OPTIONS = [
  ...STAGES.map((s) => ({
    label: `${s.code.toUpperCase()} — ${s.name}`,
    value: s.code,
  })),
  { label: "✅ Hoàn thành", value: "done" as StageCode },
  { label: "⏸ Tạm dừng", value: "paused" as StageCode },
  { label: "❌ Huỷ", value: "cancelled" as StageCode },
];

/**
 * Phân loại 4 Cấp Độ Cảnh Báo Sản Xuất:
 * 🟡 Sắp đến hạn: còn <= 7 ngày đến ngày trả.
 * 🔴 Đơn muộn: đã quá ngày trả (1-14 ngày).
 * 🔴 Trễ nghiêm trọng: đã quá 14 ngày so với ngày trả.
 * 🟠 Cần xử lý: đơn không có cập nhật bước nào trong hơn 7 ngày so với thời gian quy định của bước đó.
 */
export interface AlertStatus {
  level: "approaching" | "overdue" | "critical_overdue" | "stalled" | "normal";
  label: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  message: string;
  daysDiff?: number;
}

export function getOrderAlertStatus(order: {
  status?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  stageStartedAt?: string;
  updatedAt?: string;
}): AlertStatus {
  const status = order.status;
  if (!status || status === "done" || status === "cancelled") {
    return {
      level: "normal",
      label: "Bình thường",
      color: "#10b981",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      badgeBorder: "rgba(16, 185, 129, 0.3)",
      message: "Đơn hàng hoàn tất hoặc đóng",
    };
  }

  const now = new Date();

  // 1. Kiểm tra Cảnh báo nghẽn công đoạn (🟠 Cần xử lý)
  const currentStage = getStage(status);
  if (currentStage) {
    const stageStartIso = order.stageStartedAt || order.updatedAt;
    if (stageStartIso) {
      const stageStart = new Date(stageStartIso);
      const daysInStage = (now.getTime() - stageStart.getTime()) / 86_400_000;
      const maxAllowed = currentStage.maxDurationDays + 7;
      if (daysInStage > maxAllowed) {
        const stallOver = Math.floor(daysInStage - currentStage.maxDurationDays);
        return {
          level: "stalled",
          label: "Cần xử lý",
          color: "#f97316",
          badgeBg: "rgba(249, 115, 22, 0.15)",
          badgeBorder: "rgba(249, 115, 22, 0.4)",
          message: `Kẹt ở bước ${status.toUpperCase()} quá ${stallOver} ngày so với quy định`,
          daysDiff: stallOver,
        };
      }
    }
  }

  // 2. Kiểm tra Cảnh báo Ngày trả hàng dự kiến (TAT)
  if (order.expectedDeliveryDate) {
    const deliveryDate = new Date(order.expectedDeliveryDate);
    const diffDays = Math.ceil((deliveryDate.getTime() - now.getTime()) / 86_400_000);

    // 🔴 Trễ nghiêm trọng: quá 14 ngày
    if (diffDays < -14) {
      return {
        level: "critical_overdue",
        label: "Trễ nghiêm trọng",
        color: "#ef4444",
        badgeBg: "rgba(239, 68, 68, 0.25)",
        badgeBorder: "rgba(239, 68, 68, 0.6)",
        message: `Đã quá hạn giao ${Math.abs(diffDays)} ngày (khẩn cấp!)`,
        daysDiff: diffDays,
      };
    }

    // 🔴 Đơn muộn: quá 1-14 ngày
    if (diffDays < 0) {
      return {
        level: "overdue",
        label: "Đơn muộn",
        color: "#f87171",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        badgeBorder: "rgba(239, 68, 68, 0.4)",
        message: `Đã quá hạn giao ${Math.abs(diffDays)} ngày`,
        daysDiff: diffDays,
      };
    }

    // 🟡 Sắp đến hạn: còn <= 7 ngày
    if (diffDays <= 7) {
      return {
        level: "approaching",
        label: "Sắp đến hạn",
        color: "#eab308",
        badgeBg: "rgba(234, 179, 8, 0.15)",
        badgeBorder: "rgba(234, 179, 8, 0.4)",
        message: `Còn ${diffDays} ngày đến hạn giao`,
        daysDiff: diffDays,
      };
    }
  }

  return {
    level: "normal",
    label: "Trong tiến độ",
    color: "#3b82f6",
    badgeBg: "rgba(59, 130, 246, 0.12)",
    badgeBorder: "rgba(59, 130, 246, 0.3)",
    message: "Tiến độ bình thường",
  };
}
