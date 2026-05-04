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
      name: "alt",
      label: "Mô tả ngắn",
      type: "text",
    },
  ],
};
