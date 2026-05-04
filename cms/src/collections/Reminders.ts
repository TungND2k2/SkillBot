import type { CollectionConfig } from "payload";
import {
  ownerField,
  setOwnerOnCreate,
  readByOwnerScoped,
  updateByOwnerScoped,
} from "../access/owner";

/**
 * Reminders — lịch nhắc tự do (calendar event).
 *
 * 2 type:
 *   - "standalone"  → event độc lập, không gắn entity nào
 *                     (vd: "Họp tuần T2 9h", "Cuối tháng nộp báo cáo")
 *   - "linked"       → gắn 1 entity cụ thể (đơn / khách / vải / NCC),
 *                     hiển thị reference trong message DM
 *                     (vd: "Gọi khách Tabuchi xác nhận đơn PE-001 — 14h thứ 5")
 *
 * Cron worker (apps/bot) scan mỗi 5 phút:
 *   - Tìm reminders status="scheduled" AND dueAt <= now + notifyMinutesBefore
 *   - DM Telegram cho từng recipient + role-based
 *   - PATCH status="sent", sentAt=now (dedupe)
 */
export const Reminders: CollectionConfig = {
  slug: "reminders",
  labels: { singular: "Lịch nhắc", plural: "Lịch nhắc" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "dueAt", "status", "linkedTo"],
    group: "Lịch & Nhắc nhở",
    listSearchableFields: ["title", "description"],
  },
  defaultSort: "dueAt",
  access: {
    // Mọi user thấy reminder mình tạo + reminder gửi cho mình.
    // Manager/admin thấy hết để debug lịch.
    read: readByOwnerScoped({ alsoOwnedVia: ["recipients"] }),
    create: ({ req: { user } }) =>
      ["admin", "manager", "planner", "salesperson", "qc"].includes(user?.role ?? ""),
    update: updateByOwnerScoped({
      creators: ["planner", "salesperson", "qc"],
    }),
    delete: ({ req: { user } }) =>
      ["admin", "manager"].includes(user?.role ?? ""),
  },
  hooks: {
    beforeChange: [setOwnerOnCreate],
  },
  fields: [
    ownerField,
    {
      name: "title",
      label: "Tiêu đề",
      type: "text",
      required: true,
      admin: { placeholder: "Ngắn gọn — sẽ là tiêu đề DM Telegram" },
    },
    {
      type: "row",
      fields: [
        {
          name: "type",
          label: "Loại",
          type: "select",
          required: true,
          defaultValue: "standalone",
          options: [
            { label: "🗓 Standalone (sự kiện tự do)", value: "standalone" },
            { label: "🔗 Linked (gắn 1 đơn/khách/vải/NCC)", value: "linked" },
          ],
          admin: { width: "33%" },
        },
        {
          name: "dueAt",
          label: "Ngày & giờ nhắc",
          type: "date",
          required: true,
          admin: {
            width: "33%",
            date: {
              pickerAppearance: "dayAndTime",
              timeFormat: "HH:mm",
            },
          },
        },
        {
          name: "notifyMinutesBefore",
          label: "Nhắc trước (phút)",
          type: "number",
          defaultValue: 0,
          min: 0,
          admin: {
            width: "34%",
            description:
              "0 = đúng giờ. 30 = nhắc trước 30 phút. Cron quét mỗi 5 phút.",
          },
        },
      ],
    },

    // Polymorphic relationship — chỉ hiển thị khi type=linked
    {
      name: "linkedTo",
      label: "Liên kết với",
      type: "relationship",
      relationTo: ["orders", "customers", "fabrics", "suppliers"],
      admin: {
        description: "Chọn 1 đơn / khách / mã vải / NCC. Hiển thị trong DM.",
        condition: (_, siblingData) => siblingData?.type === "linked",
      },
    },

    {
      name: "description",
      label: "Nội dung chi tiết",
      type: "textarea",
      admin: {
        rows: 4,
        description:
          "Body của tin nhắn DM. Có thể dùng {title}, {dueAt}, {linkRef} làm placeholder (cron tự thay).",
      },
    },

    // ── Người nhận ──────────────────────────────────────
    {
      type: "row",
      fields: [
        {
          name: "recipients",
          label: "Gửi tới user cụ thể",
          type: "relationship",
          relationTo: "users",
          hasMany: true,
          admin: { width: "60%", description: "Phải có Telegram ID đã link" },
        },
        {
          name: "recipientRoles",
          label: "Hoặc theo role",
          type: "select",
          hasMany: true,
          options: [
            { label: "👑 Admin", value: "admin" },
            { label: "📋 Manager", value: "manager" },
            { label: "🔧 Planner", value: "planner" },
            { label: "💼 Sales", value: "salesperson" },
            { label: "✅ QC", value: "qc" },
            { label: "📦 Storage", value: "storage" },
            { label: "💰 Accountant", value: "accountant" },
          ],
          admin: { width: "40%", description: "DM mọi user có role này" },
        },
      ],
    },

    // ── Trạng thái ──────────────────────────────────────
    {
      type: "row",
      fields: [
        {
          name: "status",
          label: "Trạng thái",
          type: "select",
          required: true,
          defaultValue: "scheduled",
          options: [
            { label: "⏳ Đã lên lịch", value: "scheduled" },
            { label: "✅ Đã gửi", value: "sent" },
            { label: "❌ Đã huỷ", value: "cancelled" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "sentAt",
          label: "Đã gửi lúc",
          type: "date",
          admin: {
            width: "50%",
            readOnly: true,
            date: { pickerAppearance: "dayAndTime" },
          },
        },
      ],
    },

    {
      name: "createdBy",
      label: "Người tạo",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ value, req, operation }) => {
            if (operation === "create" && req.user) {
              return req.user.id;
            }
            return value;
          },
        ],
      },
    },
  ],
  timestamps: true,
};
