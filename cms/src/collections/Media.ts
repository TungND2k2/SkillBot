import type { CollectionConfig, CollectionBeforeValidateHook } from "payload";
import { ownerField, setOwnerOnCreate } from "../access/owner";

/**
 * Hook tự động sinh companion SVG file cho các bản ghi có externalUrl
 * (Google Sheets, Drive, v.v.) khi chưa có file nhị phân đính kèm,
 * đảm bảo Payload lưu thành công 100% không báo lỗi "File chưa được tải lên".
 */
const ensureFileForExternalUrl: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  if (data?.externalUrl && !req.file && (!data.filename || operation === 'create')) {
    const url = String(data.externalUrl).trim();
    let service = "Liên kết ngoài";
    let icon = "🔗";
    let color = "#3b82f6";
    let slug = "link";

    if (url.includes("docs.google.com/spreadsheets")) {
      service = "Google Sheets Document";
      icon = "📊";
      color = "#10b981";
      slug = "google-sheet";
    } else if (url.includes("drive.google.com")) {
      service = "Google Drive Folder/File";
      icon = "📁";
      color = "#38bdf8";
      slug = "google-drive";
    } else if (url.includes("figma.com") || url.includes("canva.com")) {
      service = "Thiết kế Online (Figma/Canva)";
      icon = "🎨";
      color = "#ec4899";
      slug = "design";
    }

    const title = data.alt || service;
    const safeTitle = String(title).replace(/[<>&"]/g, '');
    const safeUrl = url.replace(/[<>&"]/g, '');
    const displayUrl = safeUrl.length > 70 ? `${safeUrl.slice(0, 70)}...` : safeUrl;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" rx="16"/>
  <rect x="2" y="2" width="796" height="446" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="2" rx="14"/>
  <circle cx="80" cy="80" r="36" fill="${color}" fill-opacity="0.2"/>
  <text x="80" y="92" font-size="34" text-anchor="middle" fill="#ffffff">${icon}</text>
  <text x="135" y="75" font-family="-apple-system, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${safeTitle}</text>
  <text x="135" y="100" font-family="-apple-system, monospace" font-size="14" fill="${color}">${service}</text>
  <rect x="50" y="140" width="700" height="60" rx="8" fill="#0b0f19" stroke="rgba(255,255,255,0.08)"/>
  <text x="70" y="176" font-family="monospace" font-size="13" fill="#38bdf8">${displayUrl}</text>
  <rect x="50" y="230" width="220" height="46" rx="8" fill="#2563eb"/>
  <text x="160" y="259" font-family="-apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#ffffff">↗ MỞ LIÊN KẾT GỐC</text>
  <text x="50" y="410" font-family="-apple-system, sans-serif" font-size="12" fill="#64748b">SkillBot ERP • Hệ thống quản lý sản xuất may thêu</text>
</svg>`;

    const buffer = Buffer.from(svg, "utf-8");
    const filename = `${slug}-${Date.now()}.svg`;

    req.file = {
      data: buffer,
      name: filename,
      mimetype: "image/svg+xml",
      size: buffer.length,
    };
    data.filename = filename;
    data.mimeType = "image/svg+xml";
    data.filesize = buffer.length;
  }
  return data;
};

/**
 * Media — Payload built-in upload collection.
 *
 * Dev: lưu vào ./media (bên trong cms/), Payload serve qua /media/...
 * Prod: nên cấu hình S3 adapter (@payloadcms/storage-s3).
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
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) =>
      ["admin", "manager"].includes(user?.role ?? ""),
  },
  hooks: {
    beforeValidate: [ensureFileForExternalUrl],
    beforeChange: [setOwnerOnCreate],
  },
  upload: {
    // Cho phép ảnh + PDF + SVG + HTML
    mimeTypes: ["image/*", "application/pdf", "image/svg+xml", "text/html"],
    // Hỗ trợ dán link URL tự động tải về
    pasteURL: {
      allowList: [
        { hostname: "docs.google.com", protocol: "https" },
        { hostname: "drive.google.com", protocol: "https" },
        { hostname: "figma.com", protocol: "https" },
        { hostname: "canva.com", protocol: "https" },
        { hostname: "imgur.com", protocol: "https" },
        { hostname: "i.imgur.com", protocol: "https" },
      ],
    },
    // Cho phép tạo bản ghi Media chỉ với link ngoài (Google Sheet, Drive...),
    // không bắt buộc phải upload file nhị phân thật.
    filesRequiredOnCreate: false,
  },
  fields: [
    ownerField,
    {
      name: "externalUrl",
      label: "🔗 Đường dẫn liên kết ngoài (Google Sheet / Drive / Canva / Web)",
      type: "text",
      admin: {
        components: {
          Field: "/components/admin/MediaLinkImporter",
        },
      },
    },
    {
      // UI field thuần — render iframe khi file là PDF hoặc Google Sheets/Drive.
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
