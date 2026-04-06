import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";

const skill: SkillDef = {
  name: "upload_file",
  description: "Upload file (xử lý bởi Telegram layer — tool này chỉ trả hướng dẫn)",
  category: "files",
  mutating: false,
  inputSchema: {
    file_name: z.string().optional().describe("Tên file muốn upload"),
  },
  async handler(args, _ctx) {
    return ok({
      message:
        "Để upload file, gửi trực tiếp qua Telegram (kéo thả hoặc đính kèm). Bot sẽ tự lưu vào hệ thống.",
      hint: "Supported: PDF, DOCX, XLSX, TXT, CSV, JPG, PNG, ZIP",
      requested_file: args.file_name ?? null,
    });
  },
};
export default skill;
