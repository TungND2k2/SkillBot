import type { CollectionConfig } from "payload";
import { ownerField, setOwnerOnCreate, readSameOrg } from "../access/owner";

/**
 * Nhà cung cấp / đối tác hỗ trợ sản xuất.
 *
 * 7 loại:
 *   - fabric              vải
 *   - thread              chỉ may / chỉ thêu (vật tư)
 *   - embroidery_service  dịch vụ thêu (xưởng nhận thêu)
 *   - fabric_printing     in vải (kéo lụa, in thăng hoa, in DTG, ...)
 *   - accessory           phụ kiện (cúc, khoá, mác, dây kéo, ...)
 *   - logistics           vận chuyển (nội địa / quốc tế)
 *   - packaging           bao bì
 *   - other               loại khác
 */
export const Suppliers: CollectionConfig = {
  slug: "suppliers",
  labels: { singular: "Nhà cung cấp", plural: "Nhà cung cấp" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["code", "name", "category", "specialty", "rating", "phone"],
    group: "Đối tác",
    listSearchableFields: ["code", "name", "specialty", "phone"],
  },
  access: {
    read: readSameOrg,
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
      type: "row",
      fields: [
        {
          name: "code",
          label: "Mã NCC",
          type: "text",
          required: true,
          unique: true,
          admin: { width: "33%", description: "VD: NCC-001, V-005, IN-002, VC-010" },
        },
        {
          name: "name",
          label: "Tên NCC / công ty",
          type: "text",
          required: true,
          admin: { width: "67%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "category",
          label: "Loại NCC",
          type: "select",
          required: true,
          options: [
            { label: "🧵 Vải", value: "fabric" },
            { label: "🪡 Chỉ may / chỉ thêu (vật tư)", value: "thread" },
            { label: "🎨 Dịch vụ thêu (xưởng thêu)", value: "embroidery_service" },
            { label: "🖨 In vải", value: "fabric_printing" },
            { label: "🔘 Phụ kiện (cúc, khoá, mác)", value: "accessory" },
            { label: "🚚 Vận chuyển / Logistics", value: "logistics" },
            { label: "📦 Bao bì", value: "packaging" },
            { label: "🏷 Khác", value: "other" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "specialty",
          label: "Chuyên về",
          type: "text",
          admin: {
            width: "50%",
            description:
              "Mô tả ngắn — vd: 'cotton 100%', 'thêu vi tính + handsmock', 'in thăng hoa', 'vận chuyển HCM ↔ Bắc Ninh'",
          },
        },
      ],
    },

    // ── Liên hệ ─────────────────────────────────────────
    {
      type: "row",
      fields: [
        {
          name: "contactPerson",
          label: "Người liên hệ",
          type: "text",
          admin: { width: "33%" },
        },
        {
          name: "phone",
          label: "Số điện thoại",
          type: "text",
          admin: { width: "33%" },
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          admin: { width: "34%" },
        },
      ],
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
    },

    // ── Tài chính / hoá đơn ──────────────────────────
    {
      type: "row",
      fields: [
        {
          name: "taxCode",
          label: "Mã số thuế",
          type: "text",
          admin: { width: "50%" },
        },
        {
          name: "bankAccount",
          label: "STK ngân hàng",
          type: "text",
          admin: { width: "50%", description: "vd: Vietcombank — 1023 4567 89 — Tên CTY ABC" },
        },
      ],
    },

    // ── Đánh giá nội bộ ──────────────────────────────
    {
      type: "row",
      fields: [
        {
          name: "rating",
          label: "Đánh giá nội bộ",
          type: "select",
          defaultValue: "3",
          options: [
            { label: "★★★★★ Xuất sắc", value: "5" },
            { label: "★★★★ Tốt", value: "4" },
            { label: "★★★ Trung bình", value: "3" },
            { label: "★★ Cần cải thiện", value: "2" },
            { label: "★ Hạn chế dùng", value: "1" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "isActive",
          label: "Đang hoạt động",
          type: "checkbox",
          defaultValue: true,
          admin: { width: "50%" },
        },
      ],
    },

    // ── Cấu hình theo từng loại NCC (collapsible, conditional) ──────
    {
      type: "collapsible",
      label: "🚚 Thông tin Logistics (chỉ dành cho NCC vận chuyển)",
      admin: {
        condition: (_, siblingData) => siblingData?.category === "logistics",
      },
      fields: [
        {
          name: "logisticsRoutes",
          label: "Tuyến vận chuyển",
          type: "array",
          fields: [
            {
              type: "row",
              fields: [
                { name: "from", type: "text", required: true, label: "Từ", admin: { width: "33%" } },
                { name: "to", type: "text", required: true, label: "Đến", admin: { width: "33%" } },
                {
                  name: "leadTimeDays",
                  type: "number",
                  label: "Thời gian (ngày)",
                  admin: { width: "34%" },
                },
              ],
            },
            { name: "pricePerKg", type: "number", label: "Giá / kg (đ)" },
          ],
        },
        {
          name: "vehicleTypes",
          label: "Loại phương tiện",
          type: "select",
          hasMany: true,
          options: [
            { label: "Xe máy", value: "motorbike" },
            { label: "Ô tô tải nhỏ", value: "van" },
            { label: "Container đường bộ", value: "truck" },
            { label: "Tàu biển", value: "sea" },
            { label: "Hàng không", value: "air" },
            { label: "Đường sắt", value: "rail" },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "🎨 Năng lực thêu (chỉ dành cho xưởng thêu)",
      admin: {
        condition: (_, siblingData) => siblingData?.category === "embroidery_service",
      },
      fields: [
        {
          name: "embroideryTypes",
          label: "Kiểu thêu cung cấp",
          type: "select",
          hasMany: true,
          options: [
            { label: "Thêu máy vi tính", value: "machine" },
            { label: "Thêu tay (hand embroidery)", value: "hand" },
            { label: "Thêu ren / smock", value: "smock" },
            { label: "Thêu shadow", value: "shadow" },
            { label: "French knot", value: "french_knot" },
            { label: "Thêu kim sa / hạt cườm (beaded)", value: "beaded" },
          ],
        },
        {
          name: "dailyCapacityPieces",
          label: "Năng suất tối đa (sản phẩm / ngày)",
          type: "number",
          min: 0,
        },
      ],
    },
    {
      type: "collapsible",
      label: "🖨 Năng lực in vải (chỉ dành cho NCC in)",
      admin: {
        condition: (_, siblingData) => siblingData?.category === "fabric_printing",
      },
      fields: [
        {
          name: "printingMethods",
          label: "Phương pháp in",
          type: "select",
          hasMany: true,
          options: [
            { label: "In thăng hoa (sublimation)", value: "sublimation" },
            { label: "In lụa / kéo lụa (silk-screen)", value: "silkscreen" },
            { label: "In DTG (digital direct-to-garment)", value: "dtg" },
            { label: "In chuyển nhiệt (heat transfer)", value: "heat_transfer" },
            { label: "In phản quang", value: "reflective" },
          ],
        },
        {
          name: "maxPrintWidthCm",
          label: "Khổ in tối đa (cm)",
          type: "number",
          min: 0,
        },
      ],
    },

    {
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
    },
  ],
};
