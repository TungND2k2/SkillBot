import type { CollectionConfig } from "payload";

/**
 * Users — auth collection cho dashboard.
 *
 * Roles theo guide ngành may thêu:
 *  - admin    (Chủ cơ sở)        toàn quyền
 *  - manager  (Quản lý SX)       duyệt workflow, quản lý nhân sự
 *  - planner  (Điều phối)        nhập đơn, tính định mức, đặt hàng NCC
 *  - qc       (QC)               kiểm tra chất lượng
 *  - storage  (Thủ kho)          nhập/xuất kho
 *  - accountant (Kế toán)        xem tài chính, không sửa SX
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Người dùng", plural: "Người dùng" },
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "email", "role", "isActive"],
    group: "Hệ thống",
  },
  auth: true,
  access: {
    // Mọi user đã đăng nhập đều xem được; chỉ admin/manager sửa.
    read: () => true,
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin" || user?.role === "manager",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "displayName",
      label: "Tên hiển thị",
      type: "text",
      required: true,
    },
    {
      name: "role",
      label: "Vai trò",
      type: "select",
      required: true,
      defaultValue: "planner",
      options: [
        { label: "👑 Chủ cơ sở (Admin)", value: "admin" },
        { label: "📋 Quản lý SX", value: "manager" },
        { label: "🔧 Điều phối", value: "planner" },
        { label: "💼 Sales", value: "salesperson" },
        { label: "✅ QC", value: "qc" },
        { label: "📦 Thủ kho", value: "storage" },
        { label: "💰 Kế toán", value: "accountant" },
      ],
    },
    {
      name: "isActive",
      label: "Đang dùng",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "telegramUserId",
      label: "Telegram User ID",
      type: "text",
      admin: {
        description: "Liên kết với tài khoản Telegram nếu user dùng cả 2 kênh",
      },
    },
  ],
};
