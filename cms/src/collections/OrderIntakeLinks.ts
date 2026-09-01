import type { CollectionConfig } from "payload";
import crypto from "node:crypto";

/**
 * OrderIntakeLinks — link công khai (không cần token/đăng nhập) để ai đó
 * điền dữ liệu B1 (tạo đơn mới) qua web, thường do bot Telegram sinh ra
 * khi user chat "tôi cần tạo đơn hàng".
 *
 * Bảo mật: không phải bằng auth mà bằng `slug` ngẫu nhiên dài (24 byte hex,
 * không đoán được) + tự hết hạn (status chuyển "submitted"/"expired" sau
 * khi dùng, hoặc quá `expiresAt`). Route public
 * `(frontend)/f/[slug]` + `(payload)/api/order-intake/[slug]` là 2 nơi
 * DUY NHẤT được đọc/ghi collection này từ phía không đăng nhập — luôn
 * dùng `overrideAccess: true` ở đó, KHÔNG mở access public ở đây.
 */
export const OrderIntakeLinks: CollectionConfig = {
  slug: "order-intake-links",
  labels: { singular: "Link tạo đơn", plural: "Link tạo đơn" },
  admin: {
    group: "Form & Quy trình",
    useAsTitle: "slug",
    defaultColumns: ["slug", "status", "requestedByChatId", "expiresAt", "orderId"],
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && !data.slug) {
          data.slug = crypto.randomBytes(24).toString("hex");
        }
        if (operation === "create" && !data.expiresAt) {
          data.expiresAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: "requestedByChatId",
      label: "Chat ID Telegram yêu cầu",
      type: "number",
      required: true,
      admin: { description: "Dùng để bot báo lại khi form được nộp" },
    },
    {
      name: "requestedByUserId",
      label: "Telegram user (log)",
      type: "relationship",
      relationTo: "telegram-users",
    },
    {
      name: "status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Chờ điền", value: "pending" },
        { label: "Đã nộp", value: "submitted" },
        { label: "Hết hạn", value: "expired" },
      ],
      admin: { readOnly: true },
    },
    {
      name: "expiresAt",
      label: "Hết hạn lúc",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "orderId",
      label: "Đơn hàng đã tạo",
      type: "relationship",
      relationTo: "orders",
      admin: { readOnly: true },
    },
  ],
};
