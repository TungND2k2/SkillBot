import type { CollectionConfig } from "payload";
import { ownerField, setOwnerOnCreate, readSameOrg } from "../access/owner";

/**
 * Định mức vải cho từng đơn × mã vải.
 *
 * `approvedQty` và `totalNeeded` được tính tự động từ định mức kỹ thuật
 * và % hao phí — đỡ phải tính bằng tay, đỡ sai số.
 */
export const Allowances: CollectionConfig = {
  slug: "allowances",
  labels: { singular: "Định mức vải", plural: "Định mức vải" },
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "order",
      "fabric",
      "technicalQty",
      "wastagePercent",
      "approvedQty",
      "totalNeeded",
      "status",
    ],
    group: "Sản xuất",
  },
  access: {
    read: readSameOrg,
    create: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    update: ({ req: { user } }) =>
      ["admin", "manager", "planner"].includes(user?.role ?? ""),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    ownerField,
    {
      name: "order",
      label: "Đơn hàng",
      type: "relationship",
      relationTo: "orders",
      required: true,
    },
    {
      name: "fabric",
      label: "Vải",
      type: "relationship",
      relationTo: "fabrics",
      required: true,
    },
    {
      name: "technicalQty",
      label: "ĐM kỹ thuật (m/sp)",
      type: "number",
      required: true,
      min: 0,
      admin: { step: 0.01, description: "Định mức do kỹ thuật tính" },
    },
    {
      name: "wastagePercent",
      label: "Hao phí (%)",
      type: "number",
      required: true,
      defaultValue: 8,
      min: 0,
      max: 50,
    },
    {
      name: "approvedQty",
      label: "ĐM duyệt (m/sp)",
      type: "number",
      admin: { readOnly: true, description: "= ĐM kỹ thuật × (1 + hao phí%)" },
    },
    {
      name: "totalNeeded",
      label: "Tổng cần (m)",
      type: "number",
      admin: { readOnly: true, description: "= ĐM duyệt × số lượng đơn" },
    },
    {
      name: "status",
      label: "Trạng thái duyệt",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "📝 Nháp",       value: "draft" },
        { label: "⏳ Chờ duyệt",  value: "pending" },
        { label: "✅ Đã duyệt",   value: "approved" },
        { label: "❌ Từ chối",    value: "rejected" },
      ],
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
      setOwnerOnCreate,
      async ({ data, req }) => {
        const tech = Number(data?.technicalQty ?? 0);
        const wastage = Number(data?.wastagePercent ?? 0);
        const approved = +(tech * (1 + wastage / 100)).toFixed(4);
        data.approvedQty = approved;

        // Pull order quantity to compute totalNeeded
        if (data?.order) {
          const orderId = typeof data.order === "string" ? data.order : data.order?.id ?? data.order;
          if (orderId) {
            try {
              const order = await req.payload.findByID({
                collection: "orders",
                id: orderId,
                depth: 0,
              });
              const qty = Number(order?.quantity ?? 0);
              data.totalNeeded = +(approved * qty).toFixed(2);
            } catch {
              // order not found — leave totalNeeded as-is
            }
          }
        }
        return data;
      },
    ],
  },
};
