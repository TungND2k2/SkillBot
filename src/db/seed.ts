/**
 * Seed script: upsert a tenant with a Telegram bot token.
 * Usage: npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { initDb, connectDb, closeDb, getDb } from "./connection.js";

const BOT_TOKEN   = process.env.SEED_BOT_TOKEN!;
const TENANT_NAME = process.env.SEED_TENANT_NAME ?? "SkillBot";

if (!BOT_TOKEN) {
  console.error("Set SEED_BOT_TOKEN in .env or environment before running seed.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

initDb(url);
await connectDb();

const db  = getDb();
const now = Date.now();

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

// Seed default roles
const defaultRoles = [
  { name: "admin",   label: "Quản trị viên", description: "Toàn quyền hệ thống: quản lý users, roles, cấu hình tenant, tất cả các skill",                                                      level: 100, isSystem: true },
  { name: "manager", label: "Quản lý",        description: "Quản lý vận hành: duyệt quyền, quản lý workflows/forms/rules, không được đổi roles admin",                                           level: 50,  isSystem: true },
  { name: "sale",    label: "Sales",           description: "Nhân viên kinh doanh: nhập đơn hàng, theo dõi tiến độ đơn, xem báo cáo sales",                                                      level: 20,  isSystem: false },
  { name: "qc",      label: "QC",              description: "Kiểm tra chất lượng: cập nhật kết quả QC, ghi nhận lỗi, duyệt sản phẩm qua/không qua kiểm định",                                   level: 20,  isSystem: false },
  { name: "intern",  label: "Thực tập sinh",   description: "Thực tập sinh: xem thông tin, nhập liệu cơ bản, không được xóa hoặc thay đổi dữ liệu quan trọng",                                  level: 10,  isSystem: false },
  { name: "user",    label: "Người dùng",      description: "Người dùng thông thường: sử dụng hệ thống cơ bản, nhập liệu, chạy workflows được phép",                                            level: 10,  isSystem: true },
];

for (const role of defaultRoles) {
  const exists = await db.collection("tenant_roles").findOne({ tenantId, name: role.name });
  if (!exists) {
    await db.collection("tenant_roles").insertOne({ ...role, tenantId, createdAt: now, updatedAt: now });
    console.log(`✓ Created role "${role.name}"`);
  }
}

await closeDb();
