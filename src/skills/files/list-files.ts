import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "list_files",
  description: "Xem files đã upload (limit?)",
  category: "files",
  mutating: false,
  inputSchema: {
    limit: z.number().optional().default(20).describe("Số lượng tối đa"),
  },
  async handler(args, ctx) {
    const limit = (args.limit as number) ?? 20;
    const rows = await getDb()
      .collection("files")
      .find({ tenantId: ctx.tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return ok((rows as any[]).map(r => ({ id: String(r._id), fileName: r.fileName, mimeType: r.mimeType, fileSize: r.fileSize, s3Url: r.s3Url, createdAt: r.createdAt })));
  },
};
export default skill;
