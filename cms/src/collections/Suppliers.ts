import type { CollectionConfig } from "payload";

/** Nhà cung cấp vải / chỉ thêu / phụ kiện. */
export const Suppliers: CollectionConfig = {
  slug: "suppliers",
  labels: { singular: "Nhà cung cấp", plural: "Nhà cung cấp" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["code", "name", "category", "rating", "phone"],
    group: "Đối tác",
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    update: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "code",
      label: "Mã NCC",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "VD: NCC-001" },
    },
    {
      name: "name",
      label: "Tên NCC",
      type: "text",
      required: true,
    },
    {
      name: "category",
      label: "Loại hàng",
      type: "select",
      required: true,
      options: [
        { label: "Vải", value: "fabric" },
        { label: "Chỉ thêu", value: "thread" },
        { label: "Phụ kiện (cúc, khóa, mác...)", value: "accessory" },
        { label: "Bao bì", value: "packaging" },
        { label: "Khác", value: "other" },
      ],
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "text",
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
    },
    {
      name: "rating",
      label: "Đánh giá",
      type: "select",
      defaultValue: "3",
      options: [
        { label: "★★★★★ Xuất sắc", value: "5" },
        { label: "★★★★ Tốt", value: "4" },
        { label: "★★★ Trung bình", value: "3" },
        { label: "★★ Cần cải thiện", value: "2" },
        { label: "★ Hạn chế dùng", value: "1" },
      ],
    },
    {
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
    },
  ],
};
