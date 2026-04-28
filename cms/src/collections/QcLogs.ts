import type { CollectionConfig } from "payload";

/**
 * QC Log — kết quả kiểm tra chất lượng theo từng lô của 1 đơn hàng.
 *
 * `passRate` tự tính từ `inspectedQty - defectCount`.
 * `conclusion` (Đạt / Trả NCC) tự derive theo ngưỡng 95% theo guide.
 */
export const QcLogs: CollectionConfig = {
  slug: "qc-logs",
  labels: { singular: "QC log", plural: "QC log" },
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "order",
      "batch",
      "inspectedQty",
      "defectCount",
      "passRate",
      "conclusion",
    ],
    group: "Sản xuất",
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) =>
      ["admin", "manager", "qc"].includes(user?.role ?? ""),
    update: ({ req: { user } }) =>
      ["admin", "manager", "qc"].includes(user?.role ?? ""),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "order",
      label: "Đơn hàng",
      type: "relationship",
      relationTo: "orders",
      required: true,
    },
    {
      name: "batch",
      label: "Lô",
      type: "text",
      required: true,
      admin: { description: "VD: Lô 1, Lô 2" },
    },
    {
      name: "inspectedQty",
      label: "SL kiểm",
      type: "number",
      required: true,
      min: 1,
    },
    {
      name: "defectCount",
      label: "Số lỗi",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: "passRate",
      label: "Pass rate (%)",
      type: "number",
      admin: { readOnly: true, description: "Tự tính từ SL kiểm và số lỗi" },
    },
    {
      name: "conclusion",
      label: "Kết luận",
      type: "select",
      admin: { readOnly: true, description: "Đạt nếu pass ≥ 95%" },
      options: [
        { label: "✅ Đạt",         value: "pass" },
        { label: "❌ Trả NCC sửa", value: "fail" },
      ],
    },
    {
      name: "defectTypes",
      label: "Loại lỗi",
      type: "select",
      hasMany: true,
      options: [
        { label: "Đường chỉ", value: "thread-line" },
        { label: "Màu chỉ", value: "thread-color" },
        { label: "Đường may", value: "seam" },
        { label: "Kỹ thuật thêu", value: "embroidery" },
        { label: "Ngoại quan", value: "appearance" },
      ],
    },
    {
      name: "notes",
      label: "Ghi chú / mô tả lỗi",
      type: "textarea",
    },
    {
      name: "inspector",
      label: "Người kiểm",
      type: "relationship",
      relationTo: "users",
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data }) => {
        const inspected = Number(data?.inspectedQty ?? 0);
        const defects = Number(data?.defectCount ?? 0);
        if (inspected > 0) {
          const passRate = +((inspected - defects) / inspected * 100).toFixed(2);
          data.passRate = passRate;
          data.conclusion = passRate >= 95 ? "pass" : "fail";
        } else {
          data.passRate = 0;
          data.conclusion = "fail";
        }
        return data;
      },
    ],
  },
};
