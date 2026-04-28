/**
 * Seed 6 bước workflow theo spec khách hàng (may thêu xuất khẩu trẻ em).
 *
 * Idempotent — gọi nhiều lần upsert theo `code`.
 *
 * Run:
 *   PAYLOAD_URL=http://localhost:3001 \
 *   SEED_ADMIN_EMAIL=admin@skillbot.local \
 *   SEED_ADMIN_PASSWORD=... \
 *   npx tsx scripts/seed-workflow-stages.ts
 */
const PAYLOAD_URL = process.env.PAYLOAD_URL ?? "http://localhost:3001";
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@skillbot.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123zXc_-";

interface StageSeed {
  order: number;
  code: string;
  name: string;
  durationDays?: number;
  minDurationDays?: number;
  maxDurationDays?: number;
  responsibleRole: string;
  approverRoles: string[];
  description: string;
  deliverables: { item: string }[];
  qualityChecks?: { check: string }[];
  reminders: {
    atDay: number;
    recipients: string[];
    kind: "checkin" | "overdue" | "critical";
    message: string;
  }[];
}

const STAGES: StageSeed[] = [
  // ── B1 ──────────────────────────────────────────────────────
  {
    order: 1,
    code: "b1",
    name: "Nhận đơn và hiểu yêu cầu",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 2,
    responsibleRole: "salesperson",
    approverRoles: ["manager", "accountant"],
    description: `Nhận đề bài từ Sales. Xác nhận:
- Thiết kế / đề bài / size / số lượng
- Chất liệu (vải)
- Nguyên phụ liệu (ren, ruy băng, cúc, ...)
- Deadline

ĐỀ BÀI CẦN CHÍNH XÁC TUYỆT ĐỐI VỀ MẶT THÔNG TIN.`,
    deliverables: [
      { item: "Hóa đơn (link / file PDF)" },
      { item: "Đề bài (link / file PDF) — có deadline" },
      { item: "Ảnh khách xác nhận hóa đơn" },
      { item: "Kế toán confirm đặt cọc" },
    ],
    reminders: [
      {
        atDay: 1,
        recipients: ["salesperson", "manager"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ({customer}) đã ở B1 nhận đơn {daysSinceStart} ngày. Cần đẩy sang B2 — kiểm tra: hóa đơn, đề bài, ảnh xác nhận, kế toán confirm.",
      },
    ],
  },

  // ── B2 ──────────────────────────────────────────────────────
  {
    order: 2,
    code: "b2",
    name: "Tính định mức",
    durationDays: 1,
    minDurationDays: 1,
    maxDurationDays: 2,
    responsibleRole: "planner",
    approverRoles: ["manager"],
    description: `Mỗi mã hàng / thiết kế cần định mức rõ:
- Vải chính: m/pcs
- Vải phụ (lót, bèo): m/pcs
- Nguyên phụ liệu (ren, ruy băng, ...)

Output: bảng định mức rõ ràng + tổng vải cần mua. Đưa quản lý duyệt.`,
    deliverables: [
      { item: "Bảng định mức (collection allowances)" },
      { item: "Tổng vải cần mua theo từng mã" },
      { item: "Quản lý duyệt định mức" },
    ],
    reminders: [
      {
        atDay: 1,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "📋 Đơn {orderCode}: cần tính định mức và trình quản lý duyệt hôm nay.",
      },
      {
        atDay: 2,
        recipients: ["manager", "admin"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B2 quá {daysOverdue} ngày — định mức chưa có / chưa duyệt.",
      },
    ],
  },

  // ── B3 ──────────────────────────────────────────────────────
  {
    order: 3,
    code: "b3",
    name: "Tìm và mua nguyên liệu",
    durationDays: 7,
    minDurationDays: 5,
    maxDurationDays: 10,
    responsibleRole: "planner",
    approverRoles: ["manager", "accountant"],
    description: `Kiểm tra tồn kho. Nếu thiếu thì list mua từ NCC.

Output:
- Bảng kê chi phí vải / NPL theo từng đơn → quản lý duyệt
- Toa vải / NPL → kế toán kiểm tra & lưu

Khi nhận hàng từ NCC kiểm tra ngay:
- Màu (trắng off-white vs pure white, ...)
- Chất vải (cotton 100% hay pha, độ dày, độ mịn)
- Lỗi vải (đốm, sọc, bẩn)
- Vải lạ → test giặt trước (phai, co)`,
    deliverables: [
      { item: "Bảng kê chi phí (manager duyệt)" },
      { item: "Toa vải / NPL (kế toán lưu)" },
      { item: "Vải / NPL nhập kho — kiểm chất lượng" },
    ],
    qualityChecks: [
      { check: "Màu đúng (so sánh swatch chuẩn)" },
      { check: "Chất vải đúng (cotton 100% hay pha)" },
      { check: "Không lỗi vải (đốm, sọc, bẩn)" },
      { check: "Test giặt với vải lạ" },
    ],
    reminders: [
      {
        atDay: 5,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "📦 Đơn {orderCode}: B3 mua nguyên liệu đã {daysSinceStart} ngày. Cập nhật tiến độ đặt hàng NCC.",
      },
      {
        atDay: 8,
        recipients: ["manager", "admin"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B3 quá {daysOverdue} ngày — nguyên liệu chưa về đủ.",
      },
    ],
  },

  // ── B4 ──────────────────────────────────────────────────────
  {
    order: 4,
    code: "b4",
    name: "Sản xuất — Gửi đề bài NCC",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 5,
    responsibleRole: "planner",
    approverRoles: ["manager"],
    description: `Làm việc với nhà cung cấp (NCC). Gửi đề bài cho NCC, yêu cầu có:
- Hình ảnh thiết kế minh họa rõ ràng
- Mô tả: style, vải (woven/knit) + ảnh, thêu, NPL (ren/ruy băng), lót toàn bộ hay không, phụ kiện (nơ/quần chip), deadline

Với mẫu lạ / khó / chi tiết phức tạp: làm 1 mẫu duyệt trước khi sản xuất số lượng.`,
    deliverables: [
      { item: "Đề bài đầy đủ gửi NCC (có ảnh + mô tả + deadline)" },
      { item: "Mẫu thử duyệt (với mã lạ/phức tạp)" },
      { item: "Xác nhận deadline 2 bên" },
    ],
    reminders: [
      {
        atDay: 1,
        recipients: ["planner"],
        kind: "checkin",
        message: "📤 Đơn {orderCode}: gửi đề bài NCC + xác nhận deadline.",
      },
      {
        atDay: 3,
        recipients: ["manager"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B4 quá {daysOverdue} ngày — NCC chưa xác nhận?",
      },
    ],
  },

  // ── B5 ──────────────────────────────────────────────────────
  {
    order: 5,
    code: "b5",
    name: "Triển khai sản xuất (Thêu + May)",
    durationDays: 25,
    minDurationDays: 22,
    maxDurationDays: 35,
    responsibleRole: "supplier",
    approverRoles: ["manager"],
    description: `NCC cắt vải theo size, phân chuyền.

THÊU (15-20 ngày):
- Cần thêu trước, duyệt chỉ, duyệt mẫu thêu
- Sau khi NCC nhận vải 1 tuần phải có ảnh cập nhật thêu

MAY (10-15 ngày):
- Mẫu lạ / phức tạp: may mẫu duyệt trước
- Sau khi nhận vải 4 tuần phải có ảnh cập nhật may`,
    deliverables: [
      { item: "Ảnh cập nhật thêu (sau 1 tuần)" },
      { item: "Mẫu thêu duyệt" },
      { item: "Ảnh cập nhật may (sau 4 tuần)" },
      { item: "Mẫu may duyệt (với mã phức tạp)" },
    ],
    reminders: [
      {
        atDay: 7,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "🧵 Đơn {orderCode}: đã 1 tuần kể từ B5 — cần ảnh cập nhật thêu từ NCC.",
      },
      {
        atDay: 28,
        recipients: ["planner", "manager"],
        kind: "checkin",
        message: "✂️ Đơn {orderCode}: đã 4 tuần — cần ảnh cập nhật may từ NCC.",
      },
      {
        atDay: 35,
        recipients: ["manager", "admin"],
        kind: "critical",
        message: "🚨 Đơn {orderCode} đã trễ B5 {daysOverdue} ngày — cần can thiệp.",
      },
    ],
  },

  // ── B6 ──────────────────────────────────────────────────────
  {
    order: 6,
    code: "b6",
    name: "QC & Đóng gói giao hàng",
    durationDays: 2,
    minDurationDays: 1,
    maxDurationDays: 4,
    responsibleRole: "qc",
    approverRoles: ["manager", "qc"],
    description: `QC quá trình (mỗi công đoạn: kiểm thiết kế, màu chỉ, form, dáng → lỗi feedback sửa ngay).

QC cuối — checklist 7 hạng mục:
- Không bẩn
- Form chuẩn
- Smock đều
- Không chỉ thừa
- Không nhăn
- Size đúng
- Mác đúng

Đóng gói:
- Chia size
- Dán sticker size + style`,
    deliverables: [
      { item: "QC log với pass rate ≥ 95%" },
      { item: "Lô đóng gói chia size" },
      { item: "Sticker size + style đầy đủ" },
      { item: "Packing list" },
    ],
    qualityChecks: [
      { check: "Không bẩn" },
      { check: "Form chuẩn" },
      { check: "Smock đều" },
      { check: "Không chỉ thừa" },
      { check: "Không nhăn" },
      { check: "Size đúng" },
      { check: "Mác đúng" },
    ],
    reminders: [
      {
        atDay: 1,
        recipients: ["qc"],
        kind: "checkin",
        message: "🔍 Đơn {orderCode}: tiến hành QC final + chuẩn bị giao hàng.",
      },
      {
        atDay: 3,
        recipients: ["manager"],
        kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B6 quá {daysOverdue} ngày — QC / đóng gói chưa xong.",
      },
    ],
  },

  // ── done ────────────────────────────────────────────────────
  {
    order: 7,
    code: "done",
    name: "Hoàn thành",
    durationDays: 0,
    responsibleRole: "manager",
    approverRoles: [],
    description: "Đơn đã giao xong. Lưu trữ chứng từ, đối soát công nợ.",
    deliverables: [
      { item: "Lô hàng đã giao" },
      { item: "Khách xác nhận nhận hàng" },
      { item: "Đối soát công nợ" },
    ],
    reminders: [],
  },
];

async function main() {
  console.log(`→ Login Payload @ ${PAYLOAD_URL}`);
  const loginRes = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status}`);
    process.exit(1);
  }
  const { token } = (await loginRes.json()) as { token: string };
  console.log("✓ Login OK\n");

  for (const stage of STAGES) {
    const findRes = await fetch(
      `${PAYLOAD_URL}/api/workflow-stages?where[code][equals]=${stage.code}&limit=1`,
      { headers: { Authorization: `JWT ${token}` } },
    );
    const found = (await findRes.json()) as { docs: Array<{ id: string }> };

    const body = { ...stage, isActive: true };

    if (found.docs.length > 0) {
      const id = found.docs[0].id;
      const r = await fetch(`${PAYLOAD_URL}/api/workflow-stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `JWT ${token}` },
        body: JSON.stringify(body),
      });
      if (r.ok) console.log(`✓ Updated [${stage.code}] ${stage.name}`);
      else console.error(`✗ Update [${stage.code}] failed: ${r.status} ${await r.text()}`);
    } else {
      const r = await fetch(`${PAYLOAD_URL}/api/workflow-stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `JWT ${token}` },
        body: JSON.stringify(body),
      });
      if (r.ok) console.log(`✓ Created [${stage.code}] ${stage.name}`);
      else console.error(`✗ Create [${stage.code}] failed: ${r.status} ${await r.text()}`);
    }
  }

  console.log(`\nXong. Mở admin → "Workflow đơn hàng" để xem/sửa.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
