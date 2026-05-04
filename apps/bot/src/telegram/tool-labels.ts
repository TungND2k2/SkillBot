/**
 * Map tool name + args → câu mô tả Tiếng Việt cụ thể cho user thấy
 * AI đang làm gì.
 *
 * Thứ tự match:
 *  1. Hàm custom theo tên tool (đọc args, sinh câu cụ thể)
 *  2. Pattern generic (list_*, get_*, create_*, update_*, delete_*)
 *  3. Fallback: tool name nguyên bản
 */

type ArgsBag = Record<string, unknown>;

const ENTITY_LABEL: Record<string, string> = {
  orders: "đơn hàng",
  customers: "khách hàng",
  fabrics: "mã vải",
  suppliers: "nhà cung cấp",
  inventory: "tồn kho",
  "qc-logs": "QC log",
  allowances: "định mức vải",
  reminders: "lịch nhắc",
  forms: "form mẫu",
  "form-submissions": "submissions",
};

function entityLabel(slug: string): string {
  return ENTITY_LABEL[slug] ?? slug;
}

/** Lấy giá trị string đầu tiên từ args để chèn vào mô tả. */
function pickFilter(args: ArgsBag, keys: string[]): string | null {
  for (const k of keys) {
    const v = args[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Custom labels cho từng tool có context riêng (workflow, queries, forms). */
const CUSTOM: Record<string, (args: ArgsBag) => string> = {
  advance_order_status: (a) => {
    const id = a.orderId ?? "";
    const to = a.toStatus ?? "";
    return `📤 Chuyển đơn ${id} → ${to}`.trim();
  },
  find_low_stock: () => "⚠️ Quét tồn kho thấp",
  weekly_report: () => "📊 Tổng hợp báo cáo tuần",
  list_forms: () => "📋 Tìm form mẫu",
  get_form: (a) => `📋 Xem chi tiết form ${a.id ?? ""}`.trim(),
  submit_form: (a) => `✉️ Nộp form ${a.formId ?? ""}`.trim(),
  list_submissions: (a) =>
    a.formId ? `📜 Xem submissions của form ${a.formId}` : "📜 Xem submissions",
};

export function describeToolCall(rawName: string, args: ArgsBag = {}): string {
  // Strip MCP prefix nếu có (mcp__skillbot__list_orders → list_orders)
  const name = rawName.replace(/^mcp__\w+__/, "");

  const custom = CUSTOM[name];
  if (custom) return custom(args);

  // Generic CRUD patterns
  const m = name.match(/^(list|get|create|update|delete)_(.+)$/);
  if (m) {
    const verb = m[1];
    const slug = m[2];
    const label = entityLabel(slug);

    switch (verb) {
      case "list": {
        const filter = pickFilter(args, ["status", "customer", "name", "code", "category", "color"]);
        return filter
          ? `🔍 Tìm ${label} (${filter})`
          : `🔍 Liệt kê ${label}`;
      }
      case "get":
        return `📄 Xem chi tiết ${label}${args.id ? ` #${args.id}` : ""}`;
      case "create": {
        const title = pickFilter(args, ["title", "name", "orderCode", "code", "username"]);
        return title
          ? `✏️ Tạo ${label} "${title}"`
          : `✏️ Tạo ${label} mới`;
      }
      case "update":
        return `📝 Cập nhật ${label}${args.id ? ` #${args.id}` : ""}`;
      case "delete":
        return `🗑 Xoá ${label}${args.id ? ` #${args.id}` : ""}`;
    }
  }

  return `🔧 ${name}`;
}
