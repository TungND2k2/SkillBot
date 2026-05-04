import type { CollectionConfig } from "payload";
import { ownerField, setOwnerOnCreate, readSameOrg } from "../access/owner";

/** Mã vải đang sử dụng. Shared production data — ai trong org đều xem. */
export const Fabrics: CollectionConfig = {
  slug: "fabrics",
  labels: { singular: "Mã vải", plural: "Mã vải" },
  admin: {
    useAsTitle: "code",
    defaultColumns: ["code", "name", "color", "widthCm", "pricePerMeter"],
    group: "Sản xuất",
  },
  access: {
    read: readSameOrg, // production data — toàn bộ user đều xem
    create: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    update: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [setOwnerOnCreate],
  },
  fields: [
    ownerField,
    {
      name: "code",
      label: "Mã vải",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "VD: VL-001" },
    },
    {
      name: "name",
      label: "Tên vải",
      type: "text",
      required: true,
    },
    {
      name: "color",
      label: "Màu",
      type: "text",
      required: true,
    },
    {
      name: "material",
      label: "Chất liệu",
      type: "select",
      options: [
        { label: "Cotton 100%", value: "cotton" },
        { label: "Linen", value: "linen" },
        { label: "Linen blend", value: "linen-blend" },
        { label: "Taffeta", value: "taffeta" },
        { label: "Polyester", value: "polyester" },
        { label: "Khác", value: "other" },
      ],
    },
    {
      name: "widthCm",
      label: "Khổ vải (cm)",
      type: "number",
      min: 1,
      admin: { description: "Đơn vị cm" },
    },
    {
      name: "pricePerMeter",
      label: "Giá (đ/m)",
      type: "number",
      min: 0,
    },
    {
      name: "preferredSupplier",
      label: "NCC ưu tiên",
      type: "relationship",
      relationTo: "suppliers",
    },
    {
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
    },
  ],
};
