import type { CollectionConfig } from "payload";
import {
  ownerField,
  setOwnerOnCreate,
  readByOwnerScoped,
  updateByOwnerScoped,
} from "../access/owner";

/**
 * Customers — khách đặt hàng. Lưu để auto-fill thông tin khi tạo Order
 * mới (yêu cầu #4 trong spec).
 */
export const Customers: CollectionConfig = {
  slug: "customers",
  labels: { singular: "Khách hàng", plural: "Khách hàng" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "phone", "email"],
    group: "Đối tác",
  },
  access: {
    // Sales chỉ thấy khách mình tạo (privacy giữa các sales);
    // manager/admin/accountant thấy hết.
    read: readByOwnerScoped(),
    create: ({ req: { user } }) =>
      ["admin", "manager", "salesperson"].includes(user?.role ?? ""),
    update: updateByOwnerScoped({ creators: ["salesperson"] }),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [setOwnerOnCreate],
  },
  fields: [
    ownerField,
    {
      name: "name",
      label: "Tên / Brand",
      type: "text",
      required: true,
    },
    {
      name: "country",
      label: "Quốc gia",
      type: "text",
    },
    {
      type: "row",
      fields: [
        { name: "phone", label: "Số điện thoại", type: "text" },
        { name: "email", label: "Email", type: "email" },
      ],
    },
    {
      name: "social",
      label: "Link social (FB / IG / Zalo)",
      type: "text",
    },
    {
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
    },
  ],
  timestamps: true,
};
