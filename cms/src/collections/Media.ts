import type { CollectionConfig } from "payload";
import { ownerField, setOwnerOnCreate } from "../access/owner";

/**
 * Media — Payload built-in upload collection.
 *
 * Dev: lưu vào ./media (bên trong cms/), Payload serve qua /media/...
 * Prod: nên cấu hình S3 adapter (@payloadcms/storage-s3) — chưa wire.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Tệp tin", plural: "Tệp tin" },
  // Bật folder tree built-in của Payload v3 — admin tạo/đổi tên/di chuyển folder
  // qua sidebar, file picker khi upload vào Order cũng thấy tree.
  folders: true,
  admin: {
    group: "Hệ thống",
    useAsTitle: "filename",
  },
  access: {
    // file URL vẫn public để Order picker render được; metadata read còn
    // theo session admin.
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) =>
      ["admin", "manager"].includes(user?.role ?? ""),
  },
  hooks: {
    beforeChange: [setOwnerOnCreate],
  },
  upload: {
    // Cho phép ảnh + PDF (hóa đơn / đề bài / ảnh xác nhận)
    mimeTypes: ["image/*", "application/pdf"],
  },
  fields: [
    ownerField,
    {
      // UI field thuần — render iframe khi file là PDF (read-only preview).
      name: "pdfPreview",
      type: "ui",
      admin: {
        components: {
          Field: "/components/admin/MediaPdfPreview",
        },
      },
    },
    {
      name: "alt",
      label: "Tên / nhãn ngắn",
      type: "text",
      admin: {
        description:
          "Cho user dễ nhận diện trong list. AI thường set theo nguồn (vd: 'Telegram chat 12345 / hoá đơn PE-001').",
      },
    },
    {
      name: "kind",
      label: "Loại tài liệu (AI suy luận)",
      type: "select",
      admin: {
        description: "AI tự đoán khi nhận file — giúp lọc nhanh trong admin.",
      },
      options: [
        { label: "💰 Hoá đơn", value: "invoice" },
        { label: "📋 Đề bài", value: "brief" },
        { label: "🎨 Ảnh thiết kế / sketch", value: "design" },
        { label: "🎴 Mẫu vải swatch", value: "fabric_swatch" },
        { label: "🧵 Ảnh thêu cập nhật", value: "embroidery_progress" },
        { label: "✂️ Ảnh may cập nhật", value: "sewing_progress" },
        { label: "✅ QC ảnh kiểm tra", value: "qc_photo" },
        { label: "🚚 Bằng chứng giao", value: "delivery_proof" },
        { label: "👋 Ảnh khách xác nhận", value: "customer_confirmation" },
        { label: "📜 Hợp đồng", value: "contract" },
        { label: "📄 Tài liệu đối tác / NCC", value: "partner_doc" },
        { label: "📝 Khác", value: "other" },
      ],
    },
    {
      name: "description",
      label: "Mô tả đầy đủ (AI tóm tắt nội dung)",
      type: "textarea",
      admin: {
        rows: 8,
        description:
          "Bot dùng LLM tóm tắt nội dung file/ảnh khi upload. AI sau này " +
          "đọc cái này để tìm tệp liên quan đến truy vấn của user. Càng " +
          "nhiều thông tin (mã đơn, tên khách, ngày, mô tả style, vải, " +
          "thêu...) càng dễ tìm.",
      },
    },
    {
      name: "extractedText",
      label: "Nội dung text gốc (raw markdown)",
      type: "textarea",
      admin: {
        rows: 6,
        description:
          "Output thô của MarkItDown. Chỉ có với document; ảnh thì để trống.",
        readOnly: true,
      },
    },
    {
      name: "uploadedFrom",
      label: "Nguồn upload",
      type: "select",
      defaultValue: "admin",
      options: [
        { label: "Web admin", value: "admin" },
        { label: "Telegram bot", value: "telegram" },
        { label: "API", value: "api" },
      ],
      admin: { readOnly: true },
    },
    {
      name: "uploadedAt",
      label: "Ngày tải lên",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
