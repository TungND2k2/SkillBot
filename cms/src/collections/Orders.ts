import type { CollectionConfig, FieldAccess } from "payload";
import { generateOrderCode } from "../hooks/orders/generate-code";
import { computeOrderTotals } from "../hooks/orders/compute-totals";
import { validateOrderAdvance } from "../hooks/orders/advance-gate";
import { trackStageTiming } from "../hooks/orders/track-stage-timing";
import { autoAdvanceStage } from "../hooks/orders/auto-advance";
import {
  ownerField,
  setOwnerOnCreate,
  readByOwnerScoped,
  updateByOwnerScoped,
} from "../access/owner";
import { STATUS_SELECT_OPTIONS } from "../lib/workflow-stages";

// Helper: collapsible "B<X>" chỉ hiện khi status đã đến hoặc qua bước đó.
const reachedB2 = ["b2", "b3", "b4", "b5", "b6", "done"];
const reachedB3 = ["b3", "b4", "b5", "b6", "done"];
const reachedB4 = ["b4", "b5", "b6", "done"];
const reachedB5 = ["b5", "b6", "done"];
const reachedB6 = ["b6", "done"];

// Field-level role visibility.
// B2 (định mức) chỉ manager/input/admin xem; B3-B6 (ảnh sản xuất + QC)
// thêm sales vào để theo dõi.
const B2_VIEW_ROLES = ["admin", "manager", "input"];
const B3_PLUS_VIEW_ROLES = ["admin", "manager", "input", "salesperson"];

const roleHas =
  (allowed: string[]): FieldAccess =>
  ({ req }) =>
    allowed.includes((req?.user as { role?: string } | null)?.role ?? "");

const accessByRole = (allowed: string[]) => ({
  read: roleHas(allowed),
  update: roleHas(allowed),
  create: roleHas(allowed),
});

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
      "orderDate",
      "brandCode",
      "orderCode",
      "totalAmount",
      "deposit",
      "owedAmount",
      "totalQuantity",
      "expectedDeliveryDate",
      "status",
    ],
    group: "Sản xuất",
    components: {
      beforeListTable: ["/components/admin/OrdersExportButton"],
    },
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
      autoAdvanceStage,    // tự đẩy status sang bước tiếp khi đủ field
      trackStageTiming,    // chạy SAU autoAdvance để compute timing đúng
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
            // ── 1. Thông tin cơ bản ─────────────────────────
            {
              type: "collapsible",
              label: "📝 Thông tin cơ bản",
              admin: { initCollapsed: false },
              fields: [
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
                    {
                      name: "orderCode",
                      label: "Mã đơn",
                      type: "text",
                      unique: true,
                      admin: {
                        width: "33%",
                        readOnly: true,
                        description: "Tự sinh PE{seq}",
                      },
                    },
                    {
                      name: "brandCode",
                      label: "Mã thương hiệu",
                      type: "text",
                      required: true,
                      defaultValue: "PE",
                      admin: { width: "33%", description: "vd: PE/VN/JP" },
                    },
                  ],
                },
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
                      label: "Mã Sales",
                      type: "text",
                      admin: { width: "33%", description: "vd: Nguyễn Mai → MAINT" },
                    },
                  ],
                },
                {
                  name: "customer",
                  label: "Khách hàng",
                  type: "relationship",
                  relationTo: "customers",
                  required: true,
                  admin: { description: "Chọn khách có sẵn để auto-fill" },
                },
              ],
            },

            // ── 2. Hoá đơn + đề bài ────────────────────────
            {
              type: "collapsible",
              label: "📎 Hoá đơn + Đề bài",
              admin: { initCollapsed: false },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "invoiceFile",
                      label: "Hoá đơn (PDF/ảnh)",
                      type: "upload",
                      relationTo: "media",
                      required: true,
                      admin: {
                        width: "50%",
                        description: "Có khách + đơn + size + SL + giá",
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
                        description: "Đơn + mẫu + mô tả + size + SL + DEADLINE. KHÔNG có giá.",
                      },
                    },
                  ],
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

            // ── 4. Tài chính ────────────────────────────
            {
              type: "collapsible",
              label: "💰 Tài chính",
              admin: { initCollapsed: false },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "totalAmount",
                      label: "Tổng giá trị ($)",
                      type: "number",
                      required: true,
                      min: 0,
                      admin: { width: "25%" },
                    },
                    {
                      name: "deposit",
                      label: "Đặt cọc ($)",
                      type: "number",
                      defaultValue: 0,
                      min: 0,
                      admin: { width: "25%" },
                    },
                    {
                      name: "owedAmount",
                      label: "Còn nợ ($)",
                      type: "number",
                      admin: {
                        width: "25%",
                        readOnly: true,
                        description: "Tự = Tổng − Cọc",
                      },
                    },
                    {
                      name: "totalQuantity",
                      label: "Số lượng (pcs)",
                      type: "number",
                      min: 0,
                      admin: { width: "25%", description: "Tổng số sản phẩm trong đơn" },
                    },
                  ],
                },
                {
                  name: "accountantConfirmed",
                  label: "Kế toán đã nhận cọc",
                  type: "checkbox",
                  defaultValue: false,
                  access: {
                    update: ({ req: { user } }) =>
                      ["admin", "accountant"].includes(user?.role ?? ""),
                  },
                  admin: { description: "Chỉ Kế toán/Admin tick" },
                },
              ],
            },

            // ── 5. Giao hàng + deadline ─────────────────
            {
              type: "collapsible",
              label: "📦 Giao hàng",
              admin: { initCollapsed: false },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "expectedDeliveryDate",
                      label: "Hạn giao",
                      type: "date",
                      required: true,
                      admin: { width: "33%", date: { pickerAppearance: "dayOnly" } },
                    },
                    {
                      name: "shippingFee",
                      label: "Phí ship (đ)",
                      type: "number",
                      defaultValue: 0,
                      admin: { width: "33%" },
                    },
                    {
                      name: "expectedWeightKg",
                      label: "Trọng lượng dự kiến (kg)",
                      type: "number",
                      admin: { width: "34%", step: 0.1 },
                    },
                  ],
                },
              ],
            },

            // ── 6. Xác nhận khách (collapsed) ──────────
            {
              type: "collapsible",
              label: "👋 Xác nhận khách (ảnh chat)",
              admin: { initCollapsed: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "customerConfirmationImage",
                      label: "Ảnh khách xác nhận hoá đơn",
                      type: "upload",
                      relationTo: "media",
                      admin: {
                        width: "70%",
                        description:
                          "Screenshot chat — khách trả lời approved/correct/confirmed cho hoá đơn",
                      },
                    },
                    {
                      name: "confirmationVerified",
                      label: "AI xác minh",
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
              ],
            },

            // ── 7. Ghi chú ─────────────────────────────
            {
              name: "notes",
              label: "📝 Ghi chú",
              type: "textarea",
            },
          ],
        },

        // ── Tab "Tiến độ" — 5 mục: định mức → duyệt vải → thêu → hoàn thiện → QC/ship.
        // Mua NL + gửi NCC là việc nội bộ của Input (không cần báo cáo riêng);
        // sales chỉ thấy từ B3 trở đi.
        {
          label: "Tiến độ",
          fields: [
            // ── B2 — Định mức vải (manager + input) ────────
            {
              type: "collapsible",
              label: "1) Định mức vải (Google Sheet)",
              admin: {
                condition: (_, data) => reachedB2.includes(data?.status ?? ""),
                initCollapsed: false,
              },
              fields: [
                {
                  name: "fabricSheetUrl",
                  label: "Link Google Sheet bảng định mức",
                  type: "text",
                  access: accessByRole(B2_VIEW_ROLES),
                  admin: {
                    description:
                      "Dán link Google Sheet công khai (chia sẻ ai có link xem được).",
                  },
                },
                {
                  name: "allowanceApproved",
                  label: "Manager đã duyệt",
                  type: "checkbox",
                  defaultValue: false,
                  access: accessByRole(B2_VIEW_ROLES),
                  admin: {
                    description: "Manager tick để xác nhận → tự sang bước tiếp.",
                  },
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "allowanceApprovedAt",
                      label: "Ngày duyệt",
                      type: "date",
                      access: accessByRole(B2_VIEW_ROLES),
                      admin: {
                        width: "50%",
                        readOnly: true,
                        date: { pickerAppearance: "dayOnly" },
                      },
                    },
                    {
                      name: "allowanceApprovedBy",
                      label: "Người duyệt",
                      type: "relationship",
                      relationTo: "users",
                      filterOptions: () => ({ role: { in: ["manager", "admin"] } }),
                      access: accessByRole(B2_VIEW_ROLES),
                      admin: { width: "50%", readOnly: true },
                    },
                  ],
                },
              ],
            },

            // ── B3 — Duyệt vải (input up + sales xem) ───────
            {
              type: "collapsible",
              label: "2) Duyệt vải (Input show vải đã mua)",
              admin: {
                condition: (_, data) => reachedB3.includes(data?.status ?? ""),
                initCollapsed: false,
              },
              fields: [
                {
                  name: "fabricCheckPhoto",
                  label: "Ảnh vải đã mua",
                  type: "upload",
                  relationTo: "media",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: {
                    description:
                      "Input upload ảnh vải nhận từ NCC. Có ảnh là tự sang bước thêu.",
                  },
                },
              ],
            },

            // ── B4 — Ảnh thêu (input up + sales tick) ───────
            {
              type: "collapsible",
              label: "3) Ảnh thêu",
              admin: {
                condition: (_, data) => reachedB4.includes(data?.status ?? ""),
                initCollapsed: false,
              },
              fields: [
                {
                  name: "embroideryPhoto",
                  label: "Ảnh thêu cập nhật",
                  type: "upload",
                  relationTo: "media",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: { description: "Input upload ảnh thêu mới nhất." },
                },
                {
                  name: "embroideryApproved",
                  label: "Sales đã duyệt",
                  type: "checkbox",
                  defaultValue: false,
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: {
                    description: "Sales tick khi ảnh thêu OK → tự sang bước hoàn thiện.",
                  },
                },
                {
                  name: "embroideryApprovedAt",
                  label: "Ngày sales duyệt",
                  type: "date",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: { readOnly: true, date: { pickerAppearance: "dayOnly" } },
                },
              ],
            },

            // ── B5 — Ảnh hoàn thiện (input up + sales tick) ──
            {
              type: "collapsible",
              label: "4) Ảnh hoàn thiện",
              admin: {
                condition: (_, data) => reachedB5.includes(data?.status ?? ""),
                initCollapsed: false,
              },
              fields: [
                {
                  name: "sewingPhoto",
                  label: "Ảnh hoàn thiện (may xong)",
                  type: "upload",
                  relationTo: "media",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: { description: "Input upload ảnh sau khi may + ráp xong." },
                },
                {
                  name: "sewingApproved",
                  label: "Sales đã duyệt",
                  type: "checkbox",
                  defaultValue: false,
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: {
                    description: "Sales tick khi hàng OK → tự sang bước QC/ship.",
                  },
                },
                {
                  name: "sewingApprovedAt",
                  label: "Ngày sales duyệt",
                  type: "date",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: { readOnly: true, date: { pickerAppearance: "dayOnly" } },
                },
              ],
            },

            // ── B6 — QC / Đóng gói ship (sales up) ──────────
            {
              type: "collapsible",
              label: "5) QC / Đóng gói ship hàng",
              admin: {
                condition: (_, data) => reachedB6.includes(data?.status ?? ""),
                initCollapsed: false,
              },
              fields: [
                {
                  name: "qcShipPhoto",
                  label: "Ảnh QC / đóng gói ship",
                  type: "upload",
                  relationTo: "media",
                  access: accessByRole(B3_PLUS_VIEW_ROLES),
                  admin: {
                    description: "Sales upload ảnh QC + đóng gói. Có ảnh + ngày giao là done.",
                  },
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "deliveryDate",
                      label: "Ngày giao thực tế",
                      type: "date",
                      access: accessByRole(B3_PLUS_VIEW_ROLES),
                      admin: { width: "50%", date: { pickerAppearance: "dayOnly" } },
                    },
                    {
                      name: "trackingNumber",
                      label: "Mã vận đơn / tracking",
                      type: "text",
                      access: accessByRole(B3_PLUS_VIEW_ROLES),
                      admin: { width: "50%" },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── Tab "Nhà cung cấp" — array tự do, manager tự pick role + NCC
        //     khi nào cần (không gắn cứng vào status).
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

    // status: read-only — auto-advance qua hook khi user điền đủ field.
    // Vẫn show ở sidebar + list column để track tiến độ, nhưng không cho
    // edit tay (tránh user nhảy bước lung tung).
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "b1",
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Tự đổi theo dữ liệu đã điền — không sửa tay.",
      },
      options: STATUS_SELECT_OPTIONS,
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      admin: { hidden: true },
    },

    // ── Hidden — timing tự compute, reminders dedupe
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
    // Workflow ref đã bỏ — dùng STAGES hard-code, không cần
  ],
  timestamps: true,
};
