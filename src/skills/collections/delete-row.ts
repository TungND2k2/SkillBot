import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "delete_row",
  description: "Xoá dòng trong bảng. Args: row_id",
  category: "collections",
  mutating: true,
  inputSchema: {
    row_id: z.string().min(1).describe("ID của dòng cần xoá"),
  },
  async handler(args, ctx) {
    const rowId = args.row_id as string;

    const result = await getDb().collection("collection_rows").deleteOne({ _id: new ObjectId(rowId) });

    if (result.deletedCount === 0) {
      return err(`Row "${rowId}" không tồn tại`);
    }

    return ok({ deleted: true, row_id: rowId });
  },
};

export default skill;
