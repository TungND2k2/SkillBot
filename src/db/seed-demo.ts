/**
 * Demo data seed — populates the existing tenant with realistic data for the
 * embroidery factory domain so the web dashboard has something to show.
 *
 * Idempotent: re-running clears the demo collections and re-inserts.
 *
 * Usage:
 *   SEED_BOT_TOKEN=<token> npm run db:seed-demo
 *
 * Bot must already be seeded (tenant + admin user). This script only adds
 * collections, workflow templates, instances, forms, crons, audit logs,
 * tenant users.
 */
import "dotenv/config";
import { ObjectId } from "mongodb";
import { initDb, connectDb, closeDb, getDb } from "./connection.js";
import { runMigrations } from "./migrate.js";

const BOT_TOKEN = process.env.SEED_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Set SEED_BOT_TOKEN before running seed-demo.");
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
const day = 24 * 60 * 60 * 1000;

const tenant = await db.collection("tenants").findOne({ botToken: BOT_TOKEN });
if (!tenant) {
  console.error("Tenant not found. Run db:seed first.");
  process.exit(1);
}
const tenantId = String(tenant._id);

console.log(`✓ Seeding demo data for tenant ${tenant.name} (${tenantId.slice(0, 8)}…)`);

// ── Clear existing demo data ────────────────────────────────────

const demoCollectionSlugs = ["don_hang", "vai", "ncc", "dinh_muc", "ton_kho", "qc_log"];
const existingCollections = await db.collection("collections")
  .find({ tenantId, slug: { $in: demoCollectionSlugs } })
  .toArray();
const existingCollectionIds = existingCollections.map((c) => String(c._id));

if (existingCollectionIds.length > 0) {
  await db.collection("collection_rows").deleteMany({ collectionId: { $in: existingCollectionIds } });
}
await db.collection("collections").deleteMany({ tenantId, slug: { $in: demoCollectionSlugs } });
await db.collection("workflow_templates").deleteMany({ tenantId, name: { $regex: /^B[1-6]/ } });
await db.collection("workflow_instances").deleteMany({ tenantId });
await db.collection("form_templates").deleteMany({ tenantId, name: { $in: ["Phiếu nhập kho", "Phiếu xuất kho", "QC Checklist", "Tiến độ đơn hàng"] } });
await db.collection("cron_jobs").deleteMany({ tenantId });
await db.collection("audit_logs").deleteMany({});

// ── Tenant users (demo people) ──────────────────────────────────

const demoUsers = [
  { name: "Anh Hùng (Chủ)",    role: "admin",   tg: "100000001" },
  { name: "Chị Mai (QL SX)",   role: "manager", tg: "100000002" },
  { name: "Anh Tuấn (Điều phối)", role: "user",  tg: "100000003" },
  { name: "Chị Lan (QC/Kho)",  role: "qc",      tg: "100000004" },
  { name: "Anh Đức (Kế toán)", role: "user",    tg: "100000005" },
];
for (const u of demoUsers) {
  await db.collection("tenant_users").updateOne(
    { tenantId, channel: "telegram", channelUserId: u.tg },
    {
      $set: {
        tenantId,
        channel: "telegram",
        channelUserId: u.tg,
        displayName: u.name,
        role: u.role,
        isActive: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now - 30 * day },
    },
    { upsert: true },
  );
}
console.log(`✓ ${demoUsers.length} tenant users (demo)`);

// ── Collections ─────────────────────────────────────────────────

interface CollectionSeed {
  slug: string;
  name: string;
  description: string;
  fields: Array<{ name: string; label: string; type: string }>;
  rows: Array<Record<string, unknown>>;
}

const collections: CollectionSeed[] = [
  {
    slug: "don_hang",
    name: "Đơn hàng",
    description: "Đơn hàng xuất khẩu hàng may thêu trẻ em",
    fields: [
      { name: "ma_don", label: "Mã đơn", type: "string" },
      { name: "khach_hang", label: "Khách hàng", type: "string" },
      { name: "san_pham", label: "Sản phẩm", type: "string" },
      { name: "so_luong", label: "Số lượng", type: "number" },
      { name: "ngay_giao", label: "Ngày giao", type: "date" },
      { name: "trang_thai", label: "Trạng thái", type: "string" },
    ],
    rows: [
      { ma_don: "EXP-2026-018", khach_hang: "ABC Baby USA", san_pham: "Áo thêu hoa size 1Y", so_luong: 1200, ngay_giao: "2026-06-15", trang_thai: "B5 - May" },
      { ma_don: "EXP-2026-019", khach_hang: "Petit Bateau",  san_pham: "Đầm thêu chữ size 6M-1Y", so_luong: 800,  ngay_giao: "2026-06-20", trang_thai: "B3 - Mua NL" },
      { ma_don: "EXP-2026-020", khach_hang: "ABC Baby USA",  san_pham: "Bộ thêu hoa nhí",         so_luong: 500,  ngay_giao: "2026-07-05", trang_thai: "B2 - Định mức" },
      { ma_don: "EXP-2026-021", khach_hang: "Cyrillus FR",   san_pham: "Áo gió thêu logo",         so_luong: 2400, ngay_giao: "2026-07-10", trang_thai: "B1 - Nhận đơn" },
    ],
  },
  {
    slug: "vai",
    name: "Mã vải",
    description: "Danh mục vải đang sử dụng",
    fields: [
      { name: "ma", label: "Mã vải", type: "string" },
      { name: "ten", label: "Tên vải", type: "string" },
      { name: "mau", label: "Màu", type: "string" },
      { name: "kho", label: "Khổ vải (cm)", type: "number" },
      { name: "gia", label: "Giá (đ/m)", type: "number" },
    ],
    rows: [
      { ma: "VL-001", ten: "Cotton 100% trắng",  mau: "Trắng", kho: 145, gia: 85000 },
      { ma: "VL-002", ten: "Cotton 100% kem",    mau: "Kem",   kho: 145, gia: 88000 },
      { ma: "VL-003", ten: "Linen blend xanh",   mau: "Xanh hồ", kho: 150, gia: 110000 },
      { ma: "VL-004", ten: "Mỡn taffeta hồng",   mau: "Hồng",  kho: 130, gia: 95000 },
      { ma: "VL-005", ten: "Cotton kẻ caro",     mau: "Đỏ-trắng", kho: 145, gia: 92000 },
    ],
  },
  {
    slug: "ncc",
    name: "Nhà cung cấp",
    description: "NCC vải, chỉ thêu, phụ kiện",
    fields: [
      { name: "ma", label: "Mã NCC", type: "string" },
      { name: "ten", label: "Tên", type: "string" },
      { name: "loai", label: "Loại hàng", type: "string" },
      { name: "lien_he", label: "Liên hệ", type: "string" },
      { name: "danh_gia", label: "Đánh giá", type: "string" },
    ],
    rows: [
      { ma: "NCC-001", ten: "Dệt Minh Phát", loai: "Vải cotton", lien_he: "0913 xxx 011", danh_gia: "★★★★★" },
      { ma: "NCC-002", ten: "Dệt Lan Anh",   loai: "Vải linen",  lien_he: "0903 xxx 022", danh_gia: "★★★★" },
      { ma: "NCC-003", ten: "Chỉ thêu Hà Nam", loai: "Chỉ thêu", lien_he: "0987 xxx 033", danh_gia: "★★★★★" },
      { ma: "NCC-004", ten: "Cúc Việt Tiến",   loai: "Cúc, khóa", lien_he: "0902 xxx 044", danh_gia: "★★★★" },
    ],
  },
  {
    slug: "dinh_muc",
    name: "Định mức vải",
    description: "Định mức vải duyệt cho từng đơn",
    fields: [
      { name: "ma_don", label: "Đơn hàng", type: "string" },
      { name: "ma_vai", label: "Mã vải", type: "string" },
      { name: "dinh_muc_ky_thuat", label: "ĐM kỹ thuật (m/sp)", type: "number" },
      { name: "hao_phi", label: "Hao phí (%)", type: "number" },
      { name: "dinh_muc_duyet", label: "ĐM duyệt (m/sp)", type: "number" },
      { name: "tong_can", label: "Tổng cần (m)", type: "number" },
    ],
    rows: [
      { ma_don: "EXP-2026-018", ma_vai: "VL-001", dinh_muc_ky_thuat: 0.45, hao_phi: 8, dinh_muc_duyet: 0.486, tong_can: 583 },
      { ma_don: "EXP-2026-018", ma_vai: "VL-002", dinh_muc_ky_thuat: 0.12, hao_phi: 8, dinh_muc_duyet: 0.130, tong_can: 156 },
      { ma_don: "EXP-2026-019", ma_vai: "VL-003", dinh_muc_ky_thuat: 0.65, hao_phi: 10, dinh_muc_duyet: 0.715, tong_can: 572 },
    ],
  },
  {
    slug: "ton_kho",
    name: "Tồn kho",
    description: "Số lượng vải hiện có trong kho",
    fields: [
      { name: "ma_vai", label: "Mã vải", type: "string" },
      { name: "ton", label: "Tồn (m)", type: "number" },
      { name: "min", label: "Mức min", type: "number" },
      { name: "trang_thai", label: "Trạng thái", type: "string" },
      { name: "cap_nhat", label: "Cập nhật", type: "date" },
    ],
    rows: [
      { ma_vai: "VL-001", ton: 342, min: 100, trang_thai: "Đủ",     cap_nhat: "2026-04-25" },
      { ma_vai: "VL-002", ton: 68,  min: 100, trang_thai: "Sắp hết", cap_nhat: "2026-04-25" },
      { ma_vai: "VL-003", ton: 412, min: 80,  trang_thai: "Đủ",     cap_nhat: "2026-04-24" },
      { ma_vai: "VL-004", ton: 28,  min: 50,  trang_thai: "Cảnh báo", cap_nhat: "2026-04-24" },
      { ma_vai: "VL-005", ton: 156, min: 80,  trang_thai: "Đủ",     cap_nhat: "2026-04-23" },
    ],
  },
  {
    slug: "qc_log",
    name: "QC Log",
    description: "Lịch sử kiểm tra chất lượng",
    fields: [
      { name: "ma_don", label: "Đơn hàng", type: "string" },
      { name: "lo", label: "Lô", type: "string" },
      { name: "so_luong_kiem", label: "SL kiểm", type: "number" },
      { name: "loi", label: "Lỗi", type: "number" },
      { name: "pass_rate", label: "Pass %", type: "number" },
      { name: "ket_luan", label: "Kết luận", type: "string" },
    ],
    rows: [
      { ma_don: "EXP-2026-017", lo: "Lô 1", so_luong_kiem: 100, loi: 2, pass_rate: 98, ket_luan: "Đạt" },
      { ma_don: "EXP-2026-017", lo: "Lô 2", so_luong_kiem: 100, loi: 6, pass_rate: 94, ket_luan: "Trả NCC sửa" },
      { ma_don: "EXP-2026-018", lo: "Lô 1", so_luong_kiem: 50,  loi: 1, pass_rate: 98, ket_luan: "Đạt" },
    ],
  },
];

for (const c of collections) {
  const { insertedId } = await db.collection("collections").insertOne({
    tenantId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    fields: c.fields,
    isActive: true,
    createdAt: now - 7 * day,
    updatedAt: now,
  });
  for (const row of c.rows) {
    await db.collection("collection_rows").insertOne({
      collectionId: String(insertedId),
      data: row,
      createdByName: pickRandom(demoUsers).name,
      createdAt: now - Math.floor(Math.random() * 7 * day),
      updatedAt: now - Math.floor(Math.random() * day),
    });
  }
  console.log(`✓ Collection "${c.name}" (${c.rows.length} rows)`);
}

// ── Workflow templates ──────────────────────────────────────────

const workflowTemplates = [
  {
    name: "B1 - Nhận đơn",
    description: "Tạo collection đơn hàng mới, gửi thông báo cho kỹ thuật & quản lý",
    domain: "san_xuat",
    stages: [
      { id: "validate", name: "Xác nhận đề bài", actor: "manager" },
      { id: "approve",  name: "Ký duyệt thông tin", actor: "manager" },
    ],
  },
  {
    name: "B2 - Tính định mức",
    description: "Tính ĐM kỹ thuật × (1 + hao phí%), tạo workflow gửi quản lý ký",
    domain: "san_xuat",
    stages: [
      { id: "calc",   name: "Nhập ĐM kỹ thuật", actor: "user" },
      { id: "review", name: "So sánh vs ĐM NCC", actor: "manager" },
      { id: "sign",   name: "Ký duyệt ĐM",       actor: "manager" },
    ],
  },
  {
    name: "B3 - Mua nguyên liệu",
    description: "Kiểm tồn kho, tính lượng thiếu, so ngưỡng phê duyệt",
    domain: "san_xuat",
    stages: [
      { id: "calc",    name: "Tính lượng cần mua", actor: "user" },
      { id: "approve", name: "Phê duyệt > 2 triệu", actor: "admin" },
      { id: "order",   name: "Đặt hàng NCC",       actor: "user" },
    ],
  },
  {
    name: "B4 - Gửi NCC",
    description: "Tổng hợp file đề bài từ collection, lưu xác nhận deadline",
    domain: "san_xuat",
    stages: [
      { id: "send",    name: "Gửi đề bài",     actor: "user" },
      { id: "confirm", name: "NCC xác nhận",   actor: "user" },
    ],
  },
  {
    name: "B5 - Sản xuất",
    description: "Nhắc NCC gửi ảnh thêu sau tuần 1, ảnh may sau tuần 4",
    domain: "san_xuat",
    stages: [
      { id: "thread", name: "Duyệt chỉ thêu",  actor: "manager" },
      { id: "sew",    name: "Duyệt form may",  actor: "manager" },
    ],
  },
  {
    name: "B6 - QC & Giao",
    description: "Tạo checklist QC 5 nhóm, tính pass rate, ký duyệt xuất hàng",
    domain: "san_xuat",
    stages: [
      { id: "qc",      name: "Kiểm chất lượng", actor: "qc" },
      { id: "ship",    name: "Ký xuất hàng",    actor: "manager" },
    ],
  },
];

const templateIds: Record<string, string> = {};
for (const t of workflowTemplates) {
  const { insertedId } = await db.collection("workflow_templates").insertOne({
    tenantId,
    name: t.name,
    description: t.description,
    domain: t.domain,
    version: 1,
    stages: t.stages,
    status: "active",
    createdAt: now - 14 * day,
    updatedAt: now - 7 * day,
  });
  templateIds[t.name] = String(insertedId);
}
console.log(`✓ ${workflowTemplates.length} workflow templates (B1-B6)`);

// ── Workflow instances ──────────────────────────────────────────

const instances = [
  { template: "B5 - Sản xuất", initiatedBy: "EXP-2026-018", currentStageId: "sew",    status: "active",    updatedAt: now - 2 * 60 * 60 * 1000 },
  { template: "B3 - Mua nguyên liệu", initiatedBy: "EXP-2026-019", currentStageId: "approve", status: "active", updatedAt: now - 6 * 60 * 60 * 1000 },
  { template: "B2 - Tính định mức", initiatedBy: "EXP-2026-020", currentStageId: "review",  status: "active", updatedAt: now - 1 * day },
  { template: "B1 - Nhận đơn", initiatedBy: "EXP-2026-021", currentStageId: "approve", status: "active", updatedAt: now - 30 * 60 * 1000 },
  { template: "B6 - QC & Giao", initiatedBy: "EXP-2026-017", currentStageId: "ship", status: "completed", updatedAt: now - 3 * day },
];
for (const i of instances) {
  const tplId = templateIds[i.template];
  if (!tplId) continue;
  await db.collection("workflow_instances").insertOne({
    templateId: tplId,
    tenantId,
    initiatedBy: i.initiatedBy,
    currentStageId: i.currentStageId,
    status: i.status,
    formData: {},
    contextData: {},
    history: [],
    createdAt: i.updatedAt - 5 * day,
    updatedAt: i.updatedAt,
    completedAt: i.status === "completed" ? i.updatedAt : undefined,
  });
}
console.log(`✓ ${instances.length} workflow instances`);

// ── Form templates ──────────────────────────────────────────────

const forms = [
  {
    name: "Phiếu nhập kho",
    schema: { fields: [
      { name: "ma_vai", label: "Mã vải", type: "string", required: true },
      { name: "so_luong", label: "Số lượng (m)", type: "number", required: true },
      { name: "ncc", label: "NCC", type: "string", required: true },
      { name: "gia", label: "Đơn giá", type: "number", required: true },
      { name: "ngay", label: "Ngày nhập", type: "date" },
    ] },
  },
  {
    name: "Phiếu xuất kho",
    schema: { fields: [
      { name: "ma_vai", label: "Mã vải", type: "string", required: true },
      { name: "so_luong", label: "Số lượng (m)", type: "number", required: true },
      { name: "ma_don", label: "Đơn hàng", type: "string" },
      { name: "muc_dich", label: "Mục đích", type: "string" },
    ] },
  },
  {
    name: "QC Checklist",
    schema: { fields: [
      { name: "ma_don", label: "Mã đơn", type: "string", required: true },
      { name: "duong_chi", label: "Đường chỉ", type: "boolean" },
      { name: "mau_chi", label: "Màu chỉ", type: "boolean" },
      { name: "duong_may", label: "Đường may", type: "boolean" },
      { name: "ki_thuat", label: "Kỹ thuật thêu", type: "boolean" },
      { name: "ngoai_quan", label: "Ngoại quan", type: "boolean" },
    ] },
  },
  {
    name: "Tiến độ đơn hàng",
    schema: { fields: [
      { name: "ma_don", label: "Mã đơn", type: "string", required: true },
      { name: "buoc", label: "Bước", type: "string", required: true },
      { name: "ngay", label: "Ngày thực tế", type: "date", required: true },
      { name: "ghi_chu", label: "Ghi chú", type: "string" },
    ] },
  },
];
for (const f of forms) {
  await db.collection("form_templates").insertOne({
    tenantId,
    name: f.name,
    schema: f.schema,
    version: 1,
    status: "active",
    createdAt: now - 14 * day,
    updatedAt: now - 7 * day,
  });
}
console.log(`✓ ${forms.length} form templates`);

// ── Cron jobs ───────────────────────────────────────────────────

const crons = [
  {
    name: "Nhắc lịch mua vải thứ Hai",
    schedule: "0 9 * * 1",
    scheduleDescription: "Mỗi thứ Hai 9h sáng",
    action: "list_rows",
    nextRunAt: nextWeekday(1, 9),
    status: "active",
    runCount: 12,
    lastResult: "ok",
    lastRunAt: now - 7 * day,
  },
  {
    name: "Báo cáo tồn kho thứ Sáu",
    schedule: "0 17 * * 5",
    scheduleDescription: "Mỗi thứ Sáu 17h",
    action: "search_all",
    nextRunAt: nextWeekday(5, 17),
    status: "active",
    runCount: 12,
    lastResult: "ok",
    lastRunAt: now - 4 * day,
  },
  {
    name: "Nhắc NCC ảnh thêu sau 7 ngày",
    schedule: "0 10 * * *",
    scheduleDescription: "Hàng ngày 10h",
    action: "list_rows",
    nextRunAt: nextDayAt(10),
    status: "active",
    runCount: 30,
    lastResult: "ok",
    lastRunAt: now - 12 * 60 * 60 * 1000,
  },
  {
    name: "Cảnh báo tồn kho < min",
    schedule: "0 8 * * *",
    scheduleDescription: "Hàng ngày 8h",
    action: "search_all",
    nextRunAt: nextDayAt(8),
    status: "active",
    runCount: 30,
    lastResult: "ok",
    lastRunAt: now - 14 * 60 * 60 * 1000,
  },
];
for (const c of crons) {
  await db.collection("cron_jobs").insertOne({
    tenantId,
    name: c.name,
    schedule: c.schedule,
    scheduleDescription: c.scheduleDescription,
    action: c.action,
    args: {},
    status: c.status,
    nextRunAt: c.nextRunAt,
    runCount: c.runCount,
    lastRunAt: c.lastRunAt,
    lastResult: c.lastResult,
    createdByName: "Anh Hùng (Chủ)",
    createdAt: now - 14 * day,
    updatedAt: c.lastRunAt,
  });
}
console.log(`✓ ${crons.length} cron jobs`);

// ── Audit logs (mock activity over the last 24h) ────────────────

const actions = ["create_row", "update_row", "approve_workflow", "create_cron", "delete_row", "set_user_role"];
const tables = ["collection_rows", "workflow_instances", "cron_jobs", "tenant_users", "form_templates"];
for (let i = 0; i < 25; i++) {
  const u = pickRandom(demoUsers);
  await db.collection("audit_logs").insertOne({
    userId: u.tg,
    userName: u.name,
    userRole: u.role,
    action: pickRandom(actions),
    resourceTable: pickRandom(tables),
    resourceId: new ObjectId().toHexString(),
    createdAt: now - Math.floor(Math.random() * day),
  });
}
console.log(`✓ 25 audit log entries`);

// ── Conversation sessions (mock) ────────────────────────────────

await db.collection("conversation_sessions").deleteMany({ tenantId, channelUserId: { $in: demoUsers.map((u) => u.tg) } });
for (const u of demoUsers) {
  await db.collection("conversation_sessions").insertOne({
    tenantId,
    channel: "telegram",
    channelUserId: u.tg,
    userName: u.name,
    userRole: u.role,
    activeInstanceId: null,
    state: { messages: Array(Math.floor(Math.random() * 20) + 5).fill({}) },
    lastMessageAt: now - Math.floor(Math.random() * 12 * 60 * 60 * 1000),
    createdAt: now - 30 * day,
  });
}
console.log(`✓ ${demoUsers.length} conversation sessions`);

await closeDb();
console.log("\n✓ Demo data ready. Mở http://localhost:3000 để xem.");

// ── helpers ─────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nextWeekday(targetDow: number, hour: number): number {
  // 0=Sun, 1=Mon ... 6=Sat
  const d = new Date();
  const todayDow = d.getDay();
  let delta = (targetDow - todayDow + 7) % 7;
  if (delta === 0 && d.getHours() >= hour) delta = 7;
  d.setDate(d.getDate() + delta);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function nextDayAt(hour: number): number {
  const d = new Date();
  if (d.getHours() >= hour) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}
