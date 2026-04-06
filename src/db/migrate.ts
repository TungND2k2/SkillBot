import { getDb } from "./connection.js";
import { logger } from "../utils/logger.js";

/**
 * Ensure all collections and indexes exist.
 */
export async function runMigrations(): Promise<void> {
  const db = getDb();

  const required = [
    "audit_logs",
    "bot_docs",
    "business_rules",
    "collection_rows",
    "collections",
    "conversation_sessions",
    "cron_jobs",
    "files",
    "form_templates",
    "permission_requests",
    "tenant_roles",
    "tenant_users",
    "tenants",
    "workflow_instances",
    "workflow_templates",
  ];

  const existing = await db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));
  for (const name of required) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }

  // Indexes
  await db.collection("tenants").createIndex({ botToken: 1 }, { unique: true });
  await db.collection("tenant_users").createIndex({ tenantId: 1, channel: 1, channelUserId: 1 }, { unique: true });
  await db.collection("tenant_roles").createIndex({ tenantId: 1, name: 1 });
  await db.collection("conversation_sessions").createIndex({ tenantId: 1, channel: 1, channelUserId: 1 }, { unique: true });
  await db.collection("collections").createIndex({ tenantId: 1, slug: 1 });
  await db.collection("collection_rows").createIndex({ collectionId: 1, tenantId: 1 });
  await db.collection("form_templates").createIndex({ tenantId: 1, status: 1 });
  await db.collection("workflow_templates").createIndex({ tenantId: 1, status: 1 });
  await db.collection("workflow_instances").createIndex({ tenantId: 1, status: 1 });
  await db.collection("workflow_approvals").createIndex({ instanceId: 1 });
  await db.collection("business_rules").createIndex({ tenantId: 1, status: 1 });
  await db.collection("cron_jobs").createIndex({ tenantId: 1, status: 1 });
  await db.collection("files").createIndex({ tenantId: 1 });
  await db.collection("bot_docs").createIndex({ tenantId: 1 });
  await db.collection("permission_requests").createIndex({ tenantId: 1, status: 1 });
  await db.collection("super_admins").createIndex({ platform: 1, platformUserId: 1 });

  logger.info("DB", `Migrations complete — ${required.length} collections ensured`);
}
