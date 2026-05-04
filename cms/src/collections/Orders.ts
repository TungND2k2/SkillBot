import type { CollectionConfig } from "payload";
import { generateOrderCode } from "../hooks/orders/generate-code";
import { computeOrderTotals } from "../hooks/orders/compute-totals";
import { validateOrderAdvance } from "../hooks/orders/advance-gate";
import { trackStageTiming } from "../hooks/orders/track-stage-timing";
import {
  ownerField,
  setOwnerOnCreate,
  readByOwnerScoped,
  updateByOwnerScoped,
} from "../access/owner";

/**
 * Orders — đơn hàng xuất khẩu trẻ em.
 *
 * Workflow B1→B6 theo guide. Bước B1 (Nhận đơn) có 15 trường + nhiều
 * validation; mỗi bước sau (B2 định mức, B3 mua NL, ...) sẽ thêm dữ liệu
 * vào các collection liên quan (Allowances, PurchaseOrders, QcLogs, ...)
 * chứ không nhồi tất cả vào đây.
 *
 * Hooks:
 *   - generateOrderCode  : sinh "PE{seq}" khi tạo mới
 *   - computeOrderTotals : owedAmount = totalAmount - deposit
 *   - validateOrderAdvance: chặn B1 → B2 nếu chưa đủ ĐK (kế toán + match
 *                           hóa đơn + ảnh xác nhận khách)
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  labels: { singular: "Đơn hàng", plural: "Đơn hàng" },
  admin: {
    useAsTitle: "orderCode",
    defaultColumns: [
      "orderCode",
      "customer",
      "totalAmount",
      "status",
      "expectedDeliveryDate",
    ],
    group: "Sản xuất",
  },
  access: {
    // sales chỉ thấy đơn của mình; manager/admin/accountant thấy hết
    read: readByOwnerScoped({ alsoOwnedVia: ["salesperson", "assignedTo"] }),
    create: ({ req: { user } }) =>
      ["admin", "manager", "salesperson", "planner"].includes(user?.role ?? ""),
    update: updateByOwnerScoped({
      creators: ["salesperson", "planner"],
      alsoOwnedVia: ["salesperson", "assignedTo"],
      alwaysCanUpdate: ["accountant"], // kế toán update đặt cọc bất kỳ đơn nào
    }),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [
      setOwnerOnCreate,
      generateOrderCode,
      computeOrderTotals,
      validateOrderAdvance,
      trackStageTiming,
    ],
  },
  fields: [
    ownerField,
    // ── Bước B1: Nhận đơn ─────────────────────────────────────
    {
      type: "tabs",
      tabs: [
        {
          label: "B1 — Nhận đơn",
          fields: [
            // 1. Ngày đặt đơn
            {
              type: "row",
              fields: [
                {
                  name: "orderDate",
                  label: "Ngày đặt đơn",
                  type: "date",
                  required: true,
                  defaultValue: () => new Date().toISOString(),
                  admin: { width: "33%", date: { pickerAppearance: "dayOnly" } },
                },
                // 2. Mã đơn — auto-gen
                {
                  name: "orderCode",
                  label: "Mã đơn",
                  type: "text",
                  unique: true,
                  admin: {
                    width: "33%",
                    readOnly: true,
                    description: "Tự sinh dạng PE{seq} khi tạo mới",
                  },
                },
                // 3a. Brand code (PE / VN / ...)
                {
                  name: "brandCode",
                  label: "Mã thương hiệu",
                  type: "text",
                  required: true,
                  defaultValue: "PE",
                  admin: { width: "33%", description: "PE = Petite Étoile, vd: PE/VN/JP" },
                },
              ],
            },

            // 3b. Country / SL / Salesperson — composite Mã DA
            {
              type: "row",
              fields: [
                {
                  name: "country",
                  label: "Quốc gia khách",
                  type: "text",
                  required: true,
                  admin: { width: "33%" },
                },
                {
                  name: "salesperson",
                  label: "Sales phụ trách",
                  type: "relationship",
                  relationTo: "users",
                  filterOptions: () => ({ role: { in: ["salesperson", "manager", "admin"] } }),
                  admin: { width: "33%" },
                },
                {
                  name: "salespersonCode",
                  label: "Mã Sales (vd: MAINT)",
                  type: "text",
                  admin: { width: "33%", description: "Tên + chữ cái viết tắt, vd: Nguyễn Thị Mai → MAINT" },
                },
              ],
            },

            // 4. Customer relationship → auto-fill
            {
              name: "customer",
              label: "Khách hàng",
              type: "relationship",
              relationTo: "customers",
              required: true,
              admin: { description: "Chọn khách có sẵn để auto-fill thông tin" },
            },

            // 5. Hóa đơn
            {
              type: "row",
              fields: [
                {
                  name: "invoiceFile",
                  label: "Hóa đơn (PDF/ảnh)",
                  type: "upload",
                  relationTo: "media",
                  required: true,
                  admin: {
                    width: "50%",
                    description: "Phải có: thông tin khách + đơn + size + SL + giá",
                  },
                },
                {
                  name: "briefFile",
                  label: "Đề bài (PDF/ảnh)",
                  type: "upload",
                  relationTo: "media",
                  required: true,
                  admin: {
                    width: "50%",
                    description: "Chỉ thông tin đơn + mẫu + mô tả + size + SL + DEADLINE. KHÔNG có khách + giá.",
                  },
                },
              ],
            },

            // 5+6. Extracted data — readonly, fill bởi AI hook (Phase A2)
            {
              type: "collapsible",
              label: "Dữ liệu AI trích từ hóa đơn / đề bài",
              admin: { initCollapsed: true },
              fields: [
                {
                  name: "invoiceData",
                  label: "Hóa đơn → JSON",
                  type: "json",
                  admin: {
                    readOnly: true,
                    description: "AI extract: customer, items[{desc, size, qty, price}], total",
                  },
                },
                {
                  name: "briefData",
                  label: "Đề bài → JSON",
                  type: "json",
                  admin: {
                    readOnly: true,
                    description: "AI extract: items[{desc, size, qty}], deadline, fabric type, embroidery type",
                  },
                },
                {
                  name: "documentMatch",
                  label: "Kết quả so khớp",
                  type: "group",
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "status",
                          type: "select",
                          defaultValue: "pending",
                          options: [
                            { label: "⏳ Chưa kiểm", value: "pending" },
                            { label: "✅ Khớp 100%", value: "match" },
                            { label: "⚠️ Lệch — cần Sales xác nhận", value: "warning" },
                            { label: "❌ Sai lệch nghiêm trọng", value: "rejected" },
                          ],
                          admin: { width: "50%", readOnly: true },
                        },
                        {
                          name: "descMatchPercent",
                          label: "% match mô tả",
                          type: "number",
                          admin: { width: "50%", readOnly: true, description: "Tối thiểu 70%" },
                        },
                      ],
                    },
                    {
                      type: "row",
                      fields: [
                        { name: "qtyMatch", label: "SL khớp", type: "checkbox", admin: { width: "33%", readOnly: true } },
                        { name: "sizeMatch", label: "Size khớp", type: "checkbox", admin: { width: "33%", readOnly: true } },
                        {
                          name: "salesConfirmedMismatch",
                          label: "Sales cam kết đề bài chuẩn dù lệch",
                          type: "checkbox",
                          admin: { width: "33%" },
                          access: {
                            update: ({ req: { user } }) =>
                              ["admin", "manager", "salesperson"].includes(user?.role ?? ""),
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // 7-8. Tổng giá + đặt cọc + còn nợ
            {
              type: "row",
              fields: [
                {
                  name: "totalAmount",
                  label: "Tổng giá trị (đ)",
                  type: "number",
                  required: true,
                  min: 0,
                  admin: { width: "33%" },
                },
                {
                  name: "deposit",
                  label: "Đặt cọc (đ)",
                  type: "number",
                  defaultValue: 0,
                  min: 0,
                  admin: { width: "33%" },
                },
                {
                  name: "owedAmount",
                  label: "Còn nợ (đ)",
                  type: "number",
                  admin: {
                    width: "33%",
                    readOnly: true,
                    description: "Tự tính = Tổng - Đặt cọc",
                  },
                },
              ],
            },

            // 10. Kế toán xác nhận
            {
              name: "accountantConfirmed",
              label: "Kế toán xác nhận đã nhận tiền cọc",
              type: "checkbox",
              defaultValue: false,
              access: {
                update: ({ req: { user } }) =>
                  ["admin", "accountant"].includes(user?.role ?? ""),
              },
              admin: { description: "Chỉ Kế toán hoặc Admin tick được" },
            },

            // 12-13. Phí ship + trọng lượng
            {
              type: "row",
              fields: [
                {
                  name: "shippingFee",
                  label: "Phí ship (đ)",
                  type: "number",
                  defaultValue: 0,
                  admin: { width: "50%" },
                },
                {
                  name: "expectedWeightKg",
                  label: "Trọng lượng dự kiến (kg)",
                  type: "number",
                  admin: { width: "50%", step: 0.1 },
                },
              ],
            },

            // 14. Thời gian trả hàng
            {
              name: "expectedDeliveryDate",
              label: "Hạn giao",
              type: "date",
              required: true,
              admin: { date: { pickerAppearance: "dayOnly" } },
            },

            // 15. Ảnh xác nhận khách
            {
              type: "row",
              fields: [
                {
                  name: "customerConfirmationImage",
                  label: "Ảnh khách xác nhận hóa đơn",
                  type: "upload",
                  relationTo: "media",
                  admin: {
                    width: "70%",
                    description: "Screenshot chat — khách trả lời approved/correct/confirmed cho câu xác nhận hóa đơn",
                  },
                },
                {
                  name: "confirmationVerified",
                  label: "AI xác minh ảnh",
                  type: "select",
                  defaultValue: "pending",
                  options: [
                    { label: "⏳ Chưa kiểm", value: "pending" },
                    { label: "✅ Hợp lệ", value: "valid" },
                    { label: "❌ Không hợp lệ", value: "invalid" },
                  ],
                  admin: { width: "30%", readOnly: true },
                },
              ],
            },

            {
              name: "notes",
              label: "Ghi chú",
              type: "textarea",
            },
          ],
        },

        // ── Tab "Nhà cung cấp" ─────────────────────────────
        {
          label: "Nhà cung cấp",
          fields: [
            {
              name: "suppliers",
              label: "NCC cấu hình cho đơn này",
              type: "array",
              admin: {
                description:
                  "Cấu hình tất cả NCC sử dụng cho đơn (vải chính, vải phụ, NPL, xưởng thêu, xưởng may, in vải, vận chuyển). " +
                  "Cron sẽ DM Telegram nhắc Sales mỗi 2 giờ nếu còn thiếu role bắt buộc (vải chính, NPL, xưởng thêu, xưởng may).",
                initCollapsed: false,
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "role",
                      label: "Vai trò",
                      type: "select",
                      required: true,
                      options: [
                        { label: "🧵 Vải chính", value: "fabric_main" },
                        { label: "🧶 Vải phụ (lót, bèo)", value: "fabric_secondary" },
                        { label: "🔘 NPL (ren, cúc, ruy băng)", value: "accessory" },
                        { label: "🎨 Xưởng thêu", value: "embroidery" },
                        { label: "✂️ Xưởng may", value: "sewing" },
                        { label: "🖨 In vải", value: "fabric_printing" },
                        { label: "🚚 Vận chuyển", value: "logistics" },
                      ],
                      admin: { width: "30%" },
                    },
                    {
                      name: "supplier",
                      label: "NCC",
                      type: "relationship",
                      relationTo: "suppliers",
                      required: true,
                      admin: { width: "70%" },
                    },
                  ],
                },
                {
                  name: "notes",
                  label: "Ghi chú riêng cho NCC này",
                  type: "textarea",
                  admin: { rows: 2 },
                },
                {
                  name: "files",
                  label: "📎 File / Ảnh",
                  type: "array",
                  admin: {
                    description:
                      "Mẫu vải, ảnh thêu/may cập nhật, ảnh QC, bằng chứng giao, ...",
                  },
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "kind",
                          label: "Loại",
                          type: "select",
                          required: true,
                          options: [
                            { label: "🧵 Ảnh vải đã nhận", value: "fabric_received" },
                            { label: "🎴 Mẫu vải swatch", value: "fabric_swatch" },
                            { label: "🎨 Ảnh thêu cập nhật", value: "embroidery_progress" },
                            { label: "🎨 Mẫu thêu duyệt", value: "embroidery_sample" },
                            { label: "✂️ Ảnh may cập nhật", value: "sewing_progress" },
                            { label: "✂️ Mẫu may duyệt", value: "sewing_sample" },
                            { label: "✅ QC ảnh kiểm tra", value: "qc_photo" },
                            { label: "🚚 Bằng chứng giao", value: "delivery_proof" },
                            { label: "📄 Tài liệu khác", value: "other" },
                          ],
                          admin: { width: "33%" },
                        },
                        {
                          name: "file",
                          label: "File",
                          type: "upload",
                          relationTo: "media",
                          required: true,
                          admin: { width: "67%" },
                        },
                      ],
                    },
                    {
                      name: "notes",
                      label: "Ghi chú",
                      type: "text",
                    },
                  ],
                },
              ],
            },
            {
              name: "supplierLastWarnedAt",
              label: "Cảnh báo NCC thiếu — gửi lần cuối",
              type: "date",
              admin: {
                readOnly: true,
                description:
                  "Cron dùng để dedupe — không spam Sales hơn 1 lần / 2 giờ.",
                date: { pickerAppearance: "dayAndTime" },
              },
            },
          ],
        },

      ],
    },

    // ── Sidebar: status + assignedTo (luôn hiện bên phải khi edit đơn) ──
    {
      name: "status",
      label: "Bước hiện tại",
      type: "select",
      required: true,
      defaultValue: "b1",
      admin: { position: "sidebar" },
      options: [
        { label: "B1 — Nhận đơn", value: "b1" },
        { label: "B2 — Tính định mức", value: "b2" },
        { label: "B3 — Mua nguyên liệu", value: "b3" },
        { label: "B4 — Gửi NCC", value: "b4" },
        { label: "B5 — Sản xuất", value: "b5" },
        { label: "B6 — QC & Giao", value: "b6" },
        { label: "✅ Hoàn thành", value: "done" },
        { label: "⏸ Tạm dừng", value: "paused" },
        { label: "❌ Hủy", value: "cancelled" },
      ],
    },
    {
      name: "assignedTo",
      label: "Phụ trách bước",
      type: "relationship",
      relationTo: "users",
      admin: { position: "sidebar" },
    },

    // ── Hidden — workflow tự link, timing tự compute, reminders dedupe ──
    {
      name: "workflow",
      type: "relationship",
      relationTo: "workflows",
      admin: { hidden: true },
    },
    {
      name: "stageStartedAt",
      type: "date",
      admin: { hidden: true },
    },
    {
      name: "expectedStageEndAt",
      type: "date",
      admin: { hidden: true },
    },
    {
      name: "remindersSent",
      type: "array",
      admin: { hidden: true },
      fields: [
        { name: "stageCode", type: "text" },
        { name: "atDay", type: "number" },
        { name: "kind", type: "text" },
        { name: "sentAt", type: "date" },
      ],
    },
  ],
  timestamps: true,
};
