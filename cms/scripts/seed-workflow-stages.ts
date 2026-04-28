/**
 * Seed default Workflow + 6 stages theo spec khách hàng (may thêu xuất khẩu).
 *
 * Idempotent — gọi lại upsert theo (workflow.slug + stage.code).
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

const WORKFLOW = {
  slug: "default-export",
  name: "Quy trình may thêu xuất khẩu (mặc định)",
  description: "6 bước B1-B6 cho đơn hàng xuất khẩu trẻ em.",
  domain: "garment-export",
  isDefault: true,
  isActive: true,
};

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
  {
    order: 1, code: "b1",
    name: "Nhận đơn và hiểu yêu cầu",
    durationDays: 1, minDurationDays: 1, maxDurationDays: 2,
    responsibleRole: "salesperson",
    approverRoles: ["manager", "accountant"],
    description: `Nhận đề bài từ Sales. Xác nhận: thiết kế, đề bài, size, số lượng, chất liệu, NPL, deadline.\nĐỀ BÀI CẦN CHÍNH XÁC TUYỆT ĐỐI.`,
    deliverables: [
      { item: "Hóa đơn (link/PDF)" },
      { item: "Đề bài (link/PDF) có deadline" },
      { item: "Ảnh khách xác nhận hóa đơn" },
      { item: "Kế toán confirm đặt cọc" },
    ],
    reminders: [
      { atDay: 1, recipients: ["salesperson", "manager"], kind: "overdue",
        message: "⚠️ Đơn {orderCode} ({customer}) đang ở B1 đã {daysSinceStart} ngày. Cần đẩy sang B2 — kiểm tra hóa đơn, đề bài, ảnh xác nhận, kế toán confirm." },
    ],
  },
  {
    order: 2, code: "b2",
    name: "Tính định mức",
    durationDays: 1, minDurationDays: 1, maxDurationDays: 2,
    responsibleRole: "planner",
    approverRoles: ["manager"],
    description: `Vải chính, vải phụ, NPL m/pcs. Output: bảng định mức + tổng vải cần mua. Đưa quản lý duyệt.`,
    deliverables: [
      { item: "Bảng định mức (allowances)" },
      { item: "Tổng vải cần mua theo từng mã" },
      { item: "Quản lý duyệt định mức" },
    ],
    reminders: [
      { atDay: 1, recipients: ["planner", "manager"], kind: "checkin",
        message: "📋 Đơn {orderCode}: cần tính định mức và trình quản lý duyệt hôm nay." },
      { atDay: 2, recipients: ["manager", "admin"], kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B2 quá {daysOverdue} ngày — định mức chưa duyệt." },
    ],
  },
  {
    order: 3, code: "b3",
    name: "Tìm và mua nguyên liệu",
    durationDays: 7, minDurationDays: 5, maxDurationDays: 10,
    responsibleRole: "planner",
    approverRoles: ["manager", "accountant"],
    description: `Kiểm tồn kho, list mua. Bảng kê chi phí (manager duyệt) + toa NPL (kế toán lưu).\nKhi nhận: kiểm màu, chất, lỗi, test giặt với vải lạ.`,
    deliverables: [
      { item: "Bảng kê chi phí (manager duyệt)" },
      { item: "Toa vải/NPL (kế toán lưu)" },
      { item: "Vải/NPL nhập kho — kiểm chất lượng" },
    ],
    qualityChecks: [
      { check: "Màu đúng (so swatch chuẩn)" },
      { check: "Chất vải đúng" },
      { check: "Không lỗi vải (đốm, sọc, bẩn)" },
      { check: "Test giặt với vải lạ" },
    ],
    reminders: [
      { atDay: 5, recipients: ["planner", "manager"], kind: "checkin",
        message: "📦 Đơn {orderCode}: B3 đã {daysSinceStart} ngày. Cập nhật tiến độ NCC." },
      { atDay: 8, recipients: ["manager", "admin"], kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B3 quá {daysOverdue} ngày — nguyên liệu chưa về đủ." },
    ],
  },
  {
    order: 4, code: "b4",
    name: "Sản xuất — Gửi đề bài NCC",
    durationDays: 2, minDurationDays: 1, maxDurationDays: 5,
    responsibleRole: "planner",
    approverRoles: ["manager"],
    description: `Gửi đề bài NCC: ảnh thiết kế, mô tả style/vải/thêu/NPL/lining/phụ kiện/deadline.\nMẫu lạ: làm 1 mẫu duyệt trước.`,
    deliverables: [
      { item: "Đề bài đầy đủ gửi NCC" },
      { item: "Mẫu thử duyệt (mã phức tạp)" },
      { item: "Xác nhận deadline 2 bên" },
    ],
    reminders: [
      { atDay: 1, recipients: ["planner"], kind: "checkin",
        message: "📤 Đơn {orderCode}: gửi đề bài NCC + xác nhận deadline." },
      { atDay: 3, recipients: ["manager"], kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B4 quá {daysOverdue} ngày — NCC chưa xác nhận?" },
    ],
  },
  {
    order: 5, code: "b5",
    name: "Triển khai sản xuất (Thêu + May)",
    durationDays: 25, minDurationDays: 22, maxDurationDays: 35,
    responsibleRole: "supplier",
    approverRoles: ["manager"],
    description: `THÊU 15-20 ngày — sau 1 tuần phải có ảnh cập nhật.\nMAY 10-15 ngày — sau 4 tuần phải có ảnh cập nhật.\nMẫu lạ: may mẫu duyệt trước.`,
    deliverables: [
      { item: "Ảnh cập nhật thêu (sau 1 tuần)" },
      { item: "Mẫu thêu duyệt" },
      { item: "Ảnh cập nhật may (sau 4 tuần)" },
      { item: "Mẫu may duyệt (mã phức tạp)" },
    ],
    reminders: [
      { atDay: 7, recipients: ["planner", "manager"], kind: "checkin",
        message: "🧵 Đơn {orderCode}: 1 tuần ở B5 — cần ảnh cập nhật thêu từ NCC." },
      { atDay: 28, recipients: ["planner", "manager"], kind: "checkin",
        message: "✂️ Đơn {orderCode}: 4 tuần — cần ảnh cập nhật may từ NCC." },
      { atDay: 35, recipients: ["manager", "admin"], kind: "critical",
        message: "🚨 Đơn {orderCode} đã trễ B5 {daysOverdue} ngày — cần can thiệp." },
    ],
  },
  {
    order: 6, code: "b6",
    name: "QC & Đóng gói giao hàng",
    durationDays: 2, minDurationDays: 1, maxDurationDays: 4,
    responsibleRole: "qc",
    approverRoles: ["manager", "qc"],
    description: `QC quá trình + QC cuối checklist 7 hạng mục.\nĐóng gói: chia size, dán sticker.`,
    deliverables: [
      { item: "QC log với pass rate ≥ 95%" },
      { item: "Lô đóng gói chia size" },
      { item: "Sticker size + style" },
      { item: "Packing list" },
    ],
    qualityChecks: [
      { check: "Không bẩn" }, { check: "Form chuẩn" }, { check: "Smock đều" },
      { check: "Không chỉ thừa" }, { check: "Không nhăn" },
      { check: "Size đúng" }, { check: "Mác đúng" },
    ],
    reminders: [
      { atDay: 1, recipients: ["qc"], kind: "checkin",
        message: "🔍 Đơn {orderCode}: tiến hành QC final + chuẩn bị giao hàng." },
      { atDay: 3, recipients: ["manager"], kind: "overdue",
        message: "⚠️ Đơn {orderCode} ở B6 quá {daysOverdue} ngày — QC/đóng gói chưa xong." },
    ],
  },
  {
    order: 7, code: "done",
    name: "Hoàn thành",
    durationDays: 0,
    responsibleRole: "manager",
    approverRoles: [],
    description: "Đơn đã giao. Lưu chứng từ, đối soát công nợ.",
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
  const auth = { Authorization: `JWT ${token}` };
  console.log("✓ Login OK\n");

  // ── Step 1: upsert Workflow ──────────────────────────────────
  const wfFind = await fetch(
    `${PAYLOAD_URL}/api/workflows?where[slug][equals]=${WORKFLOW.slug}&limit=1`,
    { headers: auth },
  );
  const wfFound = (await wfFind.json()) as { docs: Array<{ id: string }> };
  let workflowId: string;
  if (wfFound.docs.length > 0) {
    workflowId = wfFound.docs[0].id;
    await fetch(`${PAYLOAD_URL}/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(WORKFLOW),
    });
    console.log(`✓ Updated workflow #${workflowId} (${WORKFLOW.slug})`);
  } else {
    const r = await fetch(`${PAYLOAD_URL}/api/workflows`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(WORKFLOW),
    });
    if (!r.ok) {
      console.error(`Create workflow failed: ${r.status} ${await r.text()}`);
      process.exit(1);
    }
    const j = (await r.json()) as { doc: { id: string } };
    workflowId = j.doc.id;
    console.log(`✓ Created workflow #${workflowId} (${WORKFLOW.slug})`);
  }

  // ── Step 2: upsert stages thuộc workflow này ────────────────
  console.log();
  for (const stage of STAGES) {
    const stageFind = await fetch(
      `${PAYLOAD_URL}/api/workflow-stages?where[and][0][workflow][equals]=${workflowId}&where[and][1][code][equals]=${stage.code}&limit=1`,
      { headers: auth },
    );
    const found = (await stageFind.json()) as { docs: Array<{ id: string }> };
    const body = { ...stage, workflow: workflowId, isActive: true };

    if (found.docs.length > 0) {
      const id = found.docs[0].id;
      const r = await fetch(`${PAYLOAD_URL}/api/workflow-stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify(body),
      });
      if (r.ok) console.log(`✓ Updated [${stage.code}] ${stage.name}`);
      else console.error(`✗ Update [${stage.code}] failed: ${r.status} ${await r.text()}`);
    } else {
      const r = await fetch(`${PAYLOAD_URL}/api/workflow-stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify(body),
      });
      if (r.ok) console.log(`✓ Created [${stage.code}] ${stage.name}`);
      else console.error(`✗ Create [${stage.code}] failed: ${r.status} ${await r.text()}`);
    }
  }

  console.log(`\nXong. Mở admin → "Workflows" + "Workflow đơn hàng".`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
