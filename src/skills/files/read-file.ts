import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { downloadFromS3, isStorageConfigured } from "../../storage/s3.js";
import { extractText } from "../../storage/extractor.js";

const skill: SkillDef = {
  name: "read_file_content",
  description: "Đọc nội dung file text (PDF/DOCX/XLSX/TXT). Args: file_id",
  category: "files",
  mutating: false,
  inputSchema: {
    file_id: z
      .string()
      .describe("File ID hoặc tên file (hỗ trợ fuzzy match)"),
  },
  async handler(args, ctx) {
    const db = getDb();
    let fileId = args.file_id as string;

    // Fuzzy match by name if not a 24-char ObjectId hex
    if (fileId && !/^[0-9a-f]{24}$/i.test(fileId)) {
      const allFiles = await db
        .collection("files")
        .find({ tenantId: ctx.tenantId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      const match = allFiles.find((f: any) =>
        f.fileName?.toLowerCase().includes(fileId.toLowerCase()),
      );
      if (match) fileId = String((match as any)._id);
    }

    const file = await db.collection("files").findOne({ _id: new ObjectId(fileId) }) as any;
    if (!file) return err("File not found");

    if (!isStorageConfigured()) {
      return ok({
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        content: null,
        note: "S3 not configured — cannot read file content.",
      });
    }

    const result = await downloadFromS3(fileId);
    if (!result) return err("File not found in storage");

    const { content, truncated } = await extractText(result.buffer, file.mimeType, file.fileName);

    return ok({
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      content,
      truncated,
    });
  },
};
export default skill;
