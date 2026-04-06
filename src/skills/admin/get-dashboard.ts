import { z } from "zod";
import type { SkillDef } from "../_types.js";
import { ok } from "../_types.js";
import { getDb } from "../../db/connection.js";

const skill: SkillDef = {
  name: "get_dashboard",
  description: "Dashboard hệ thống",
  category: "admin",
  mutating: false,
  inputSchema: {},
  async handler(_args, ctx) {
    const db = getDb();
    const tenantId = ctx.tenantId;

    const [
      collectionsCount,
      usersCount,
      workflowsCount,
      formsCount,
      filesCount,
      cronsCount,
      docsCount,
    ] = await Promise.all([
      db.collection("collections").countDocuments({ tenantId }),
      db.collection("tenant_users").countDocuments({ tenantId }),
      db.collection("workflow_templates").countDocuments({ tenantId, status: "active" }),
      db.collection("form_templates").countDocuments({ tenantId, status: "active" }),
      db.collection("files").countDocuments({ tenantId }),
      db.collection("cron_jobs").countDocuments({ tenantId, status: "active" }),
      db.collection("bot_docs").countDocuments({ tenantId }),
    ]);

    return ok({
      collections: collectionsCount,
      users: usersCount,
      workflows: workflowsCount,
      forms: formsCount,
      files: filesCount,
      activeCrons: cronsCount,
      knowledgeDocs: docsCount,
    });
  },
};
export default skill;
