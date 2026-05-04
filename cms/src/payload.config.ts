import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { formBuilderPlugin } from "@payloadcms/plugin-form-builder";
import { vi } from "@payloadcms/translations/languages/vi";
import { en } from "@payloadcms/translations/languages/en";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Customers } from "./collections/Customers";
import { Orders } from "./collections/Orders";
import { Fabrics } from "./collections/Fabrics";
import { Suppliers } from "./collections/Suppliers";
import { Inventory } from "./collections/Inventory";
import { Allowances } from "./collections/Allowances";
import { QcLogs } from "./collections/QcLogs";
import { Media } from "./collections/Media";
import { Counters } from "./collections/Counters";
import { Workflows } from "./collections/Workflows";
import { WorkflowStages } from "./collections/WorkflowStages";
import { Reminders } from "./collections/Reminders";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  i18n: {
    fallbackLanguage: "vi",
    supportedLanguages: { vi, en },
  },
  admin: {
    user: "users",
    meta: {
      title: "SkillBot",
      titleSuffix: " · SkillBot",
      description: "Trợ lý AI quản lý sản xuất hàng may thêu xuất khẩu",
    },
    importMap: {
      baseDir: dirname,
    },
    components: {
      graphics: {
        Icon: "/components/admin/Icon",
        Logo: "/components/admin/Logo",
      },
    },
  },
  collections: [
    Users,
    Customers,
    Orders,
    Fabrics,
    Suppliers,
    Inventory,
    Allowances,
    QcLogs,
    Workflows,
    WorkflowStages,
    Reminders,
    Media,
    Counters,
  ],
  // Folder cho Media: tạo collection 'payload-folders' tự động, parent self-relation,
  // admin có folder tree trong list view + file picker.
  folders: {
    collectionOverrides: [
      ({ collection }) => ({
        ...collection,
        labels: { singular: "Thư mục", plural: "Thư mục" },
        admin: { ...collection.admin, group: "Hệ thống" },
      }),
    ],
  },
  plugins: [
    formBuilderPlugin({
      // Manager + admin tự build form qua giao diện kéo thả block
      // (text/textarea/number/email/select/radio/checkbox/date/...).
      // Submission lưu vào collection `form-submissions` với key/value.
      fields: {
        // Bật các loại field thông dụng cho ngành may thêu
        text: true,
        textarea: true,
        select: true,
        radio: true,
        checkbox: true,
        number: true,
        date: true,
        email: false,    // tắt — không cần
        state: false,    // tắt (US states)
        country: false,  // tắt — chỉ làm thị trường VN
        message: true,   // hiển thị text/hướng dẫn giữa form
        payment: false,  // tắt — không có thanh toán online
      },
      formOverrides: {
        slug: "forms",
        labels: { singular: "Form mẫu", plural: "Form mẫu" },
        admin: { group: "Form & Quy trình" },
        access: {
          read: ({ req: { user } }) => !!user,
          create: ({ req: { user } }) => ["admin", "manager"].includes(user?.role ?? ""),
          update: ({ req: { user } }) => ["admin", "manager"].includes(user?.role ?? ""),
          delete: ({ req: { user } }) => user?.role === "admin",
        },
      },
      formSubmissionOverrides: {
        slug: "form-submissions",
        labels: { singular: "Form đã nộp", plural: "Form đã nộp" },
        admin: { group: "Form & Quy trình" },
        access: {
          read: ({ req: { user } }) => !!user,
          create: () => true,             // ai cũng nộp được
          update: ({ req: { user } }) => ["admin", "manager"].includes(user?.role ?? ""),
          delete: ({ req: { user } }) => user?.role === "admin",
        },
      },
    }),
  ],
  editor: lexicalEditor(),
  db: mongooseAdapter({
    url: process.env.DATABASE_URI ?? "mongodb://localhost:27017/skillbot_cms",
  }),
  secret: process.env.PAYLOAD_SECRET ?? "default-dev-secret-change-me",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  graphQL: {
    schemaOutputFile: path.resolve(dirname, "schema.graphql"),
  },
  sharp,
  // Admin UI dùng English; field labels riêng đã viết Tiếng Việt trong từng collection.
});
