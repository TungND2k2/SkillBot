/**
 * Seed script: upsert a tenant with a Telegram bot token, default roles,
 * and (optionally) an initial super-admin web user so the dashboard is
 * usable immediately after first deploy.
 *
 * Required env: SEED_BOT_TOKEN, DATABASE_URL
 * Optional env:
 *   SEED_TENANT_NAME       — display name for the tenant (default "SkillBot")
 *   SEED_ADMIN_USERNAME    — initial web super-admin username
 *   SEED_ADMIN_PASSWORD    — initial web super-admin password (8+ chars)
 *   SEED_ADMIN_DISPLAY     — display name for the super-admin (default "Super Admin")
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { initDb, connectDb, closeDb, getDb } from "./connection.js";
import { runMigrations } from "./migrate.js";

const BOT_TOKEN = process.env.SEED_BOT_TOKEN;
const TENANT_NAME = process.env.SEED_TENANT_NAME ?? "SkillBot";
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_DISPLAY = process.env.SEED_ADMIN_DISPLAY ?? "Super Admin";

if (!BOT_TOKEN) {
  console.error("Set SEED_BOT_TOKEN in .env or environment before running seed.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

initDb(url);
await connectDb();
await runMigrations();

const db = getDb();
const now = Date.now();

// ── Tenant ───────────────────────────────────────────────────

const existing = await db.collection("tenants").findOne({ botToken: BOT_TOKEN });
let tenantId: string;

if (existing) {
  await db.collection("tenants").updateOne(
    { botToken: BOT_TOKEN },
    { $set: { botToken: BOT_TOKEN, status: "active", updatedAt: now } },
  );
  tenantId = String(existing._id);
  console.log(`✓ Updated tenant (${BOT_TOKEN.slice(0, 10)}...)`);
} else {
  const result = await db.collection("tenants").insertOne({
    name: TENANT_NAME,
    botToken: BOT_TOKEN,
    botStatus: "active",
    config: { requireApproval: false },
    aiConfig: {},
    instructions: "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  tenantId = result.insertedId.toHexString();
  console.log(`✓ Created tenant "${TENANT_NAME}"`);
}

// ── Default roles ────────────────────────────────────────────

const defaultRoles = [
  { name: "admin", label: "Quản trị viên", description: "Toàn quyền hệ thống", level: 100, isSystem: true },
  { name: "manager", label: "Quản lý", description: "Quản lý vận hành", level: 50, isSystem: true },
  { name: "sale", label: "Sales", description: "Nhân viên kinh doanh", level: 20, isSystem: false },
  { name: "qc", label: "QC", description: "Kiểm tra chất lượng", level: 20, isSystem: false },
  { name: "intern", label: "Thực tập sinh", description: "Thực tập, chỉ đọc", level: 10, isSystem: false },
  { name: "user", label: "Người dùng", description: "Người dùng thông thường", level: 10, isSystem: true },
];

for (const role of defaultRoles) {
  const exists = await db.collection("tenant_roles").findOne({ tenantId, name: role.name });
  if (!exists) {
    await db.collection("tenant_roles").insertOne({ ...role, tenantId, createdAt: now, updatedAt: now });
    console.log(`✓ Created role "${role.name}"`);
  }
}

// ── Initial super-admin web user (optional) ──────────────────

if (ADMIN_USERNAME && ADMIN_PASSWORD) {
  if (ADMIN_PASSWORD.length < 8) {
    console.error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existingAdmin = await db.collection("web_users").findOne({ username: ADMIN_USERNAME });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existingAdmin) {
    await db.collection("web_users").updateOne(
      { username: ADMIN_USERNAME },
      {
        $set: {
          passwordHash,
          isSuperAdmin: true,
          isActive: true,
          updatedAt: now,
        },
      },
    );
    console.log(`✓ Updated super-admin web user "${ADMIN_USERNAME}"`);
  } else {
    await db.collection("web_users").insertOne({
      tenantId,
      username: ADMIN_USERNAME,
      passwordHash,
      displayName: ADMIN_DISPLAY,
      role: "admin",
      isSuperAdmin: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✓ Created super-admin web user "${ADMIN_USERNAME}" (login at /login)`);
  }
} else {
  console.log("ℹ Skipping super-admin web user (set SEED_ADMIN_USERNAME + SEED_ADMIN_PASSWORD to create one)");
}

await closeDb();
console.log("✓ Seed complete");
