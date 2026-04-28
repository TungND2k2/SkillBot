import type { CollectionConfig } from "payload";

/**
 * Tồn kho theo từng mã vải.
 *
 * Dùng hook `beforeChange` để derive `status` (đủ/sắp hết/cảnh báo) từ
 * tỉ lệ `quantityM / minLevel`, giảm dữ liệu sai do nhập tay.
 */
export const Inventory: CollectionConfig = {
  slug: "inventory",
  labels: { singular: "Tồn kho", plural: "Tồn kho" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["fabric", "quantityM", "minLevel", "status", "updatedAt"],
    group: "Sản xuất",
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) =>
      ["admin", "manager", "planner", "storage"].includes(user?.role ?? ""),
    update: ({ req: { user } }) =>
      ["admin", "manager", "planner", "storage"].includes(user?.role ?? ""),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "fabric",
      label: "Vải",
      type: "relationship",
      relationTo: "fabrics",
      required: true,
      hasMany: false,
    },
    {
      name: "quantityM",
      label: "Tồn (m)",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "minLevel",
      label: "Mức tối thiểu (m)",
      type: "number",
      required: true,
      defaultValue: 50,
      min: 0,
      admin: { description: "Khi tồn xuống dưới mức này, AI sẽ cảnh báo" },
    },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      defaultValue: "ok",
      admin: { readOnly: true, description: "Tự động tính từ tồn vs min" },
      options: [
        { label: "✅ Đủ",         value: "ok" },
        { label: "⚠️ Sắp hết",    value: "low" },
        { label: "🚨 Cảnh báo",   value: "critical" },
        { label: "❌ Hết hàng",   value: "empty" },
      ],
    },
    {
      name: "lastReceivedAt",
      label: "Lần nhập gần nhất",
      type: "date",
    },
    {
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data }) => {
        const qty = Number(data?.quantityM ?? 0);
        const min = Number(data?.minLevel ?? 0);
        if (qty <= 0) data.status = "empty";
        else if (qty < min * 0.3) data.status = "critical";
        else if (qty < min) data.status = "low";
        else data.status = "ok";
        return data;
      },
    ],
  },
};
