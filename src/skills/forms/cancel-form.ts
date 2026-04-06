import { ObjectId } from "mongodb";
import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok, err } from "../_types.js";
import { getDb } from "../../db/connection.js";
import { nowMs } from "../../utils/clock.js";

const skill: SkillDef = {
  name: "cancel_form",
  description: "Huỷ form đang điền",
  category: "forms",
  mutating: true,
  inputSchema: {},
  async handler(_args, ctx) {
    const sessionId = ctx.sessionId;
    if (!sessionId) return err("No session");

    const session = await getDb()
      .collection("conversation_sessions")
      .findOne({ _id: new ObjectId(sessionId) });
    if (!session) return ok({ cancelled: false, reason: "Session not found" });

    let state = session.state as any;
    if (typeof state === "string") {
      try {
        state = JSON.parse(state);
      } catch {
        return ok({ cancelled: false, reason: "Invalid state" });
      }
    }

    if (state.formState) {
      state.formState.status = "cancelled";
    }

    await getDb()
      .collection("conversation_sessions")
      .updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { state, lastMessageAt: nowMs() } },
      );

    return ok({ cancelled: true });
  },
};
export default skill;
