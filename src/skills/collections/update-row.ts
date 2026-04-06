import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "update_row",
  description: "Cập nhật dòng trong bảng. Args: row_id, data{key:value}",
  category: "collections",
  mutating: true,
  inputSchema: {
    row_id: z.string().min(1).describe("ID của dòng cần cập nhật"),
    data: z
      .record(z.unknown())
      .describe("Dữ liệu cần cập nhật (merge với dữ liệu cũ)"),
  },
  async handler(args, ctx) {
    const rowId = args.row_id as string;
    const newData = (args.data as Record<string, unknown>) ?? {};

    const existing = await getDb().collection("collection_rows").findOne({ _id: new ObjectId(rowId) });

    if (!existing) {
      return err(`Row "${rowId}" không tồn tại`);
    }

    const merged = {
      ...(existing.data as Record<string, unknown>),
      ...newData,
    };

    await getDb().collection("collection_rows").updateOne(
      { _id: new ObjectId(rowId) },
      { $set: { data: merged, updatedAt: nowMs() } },
    );

    return ok({ id: rowId, data: merged });
  },
};

export default skill;
