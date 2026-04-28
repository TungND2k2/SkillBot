/**
 * Smart formatting helpers for collection rows.
 *
 * Field metadata is best-effort — we infer type from the field name first,
 * then fall back to value type. Lets list/card/kanban views render the same
 * data without each having its own switch statement.
 */

export type FieldKind =
  | "id"        // ma, code, ID — render monospace, primary
  | "title"    // name, ten, title — render bold
  | "status"   // trang_thai, status — render as colored badge
  | "money"    // gia, total, price (vnd) — render with locale + đ
  | "number"   // so_luong, ton, count — render with thousand separator
  | "date"     // ngay, date, *_at — render localized
  | "rating"   // danh_gia, rating — render stars/text as-is
  | "long-text" // description, ghi_chu — render with line-clamp
  | "text";    // default

export function inferKind(fieldName: string, fieldType?: string, sampleValue?: unknown): FieldKind {
  const n = fieldName.toLowerCase();

  if (fieldType === "date" || /^(ngay|date|created|updated)|_(at|date)$/.test(n)) return "date";
  if (n === "trang_thai" || n === "status" || n === "ket_luan") return "status";
  if (n === "gia" || /^(price|cost|total|amount|gia)/.test(n)) return "money";
  if (/^(ma|code|id|sku)$/.test(n) || n.startsWith("ma_")) return "id";
  if (n === "ten" || n === "name" || n === "title" || n === "san_pham") return "title";
  if (n === "danh_gia" || n === "rating") return "rating";
  if (n === "mo_ta" || n === "description" || n === "ghi_chu" || n === "note" || n === "notes") return "long-text";
  if (
    fieldType === "number" ||
    /^(so_|tong_|ton|min|max|count|num|qty|kho|hao|pass)/.test(n) ||
    typeof sampleValue === "number"
  ) {
    return "number";
  }
  return "text";
}

export function formatNumber(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function formatMoney(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}

export function formatDate(value: unknown): string {
  if (typeof value === "number") {
    return new Date(value).toLocaleDateString("vi-VN");
  }
  if (typeof value === "string") {
    // Already YYYY-MM-DD or similar — just keep it.
    return value;
  }
  return "—";
}

export function formatValue(kind: FieldKind, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (kind) {
    case "money":
      return typeof value === "number" ? formatMoney(value) : String(value);
    case "number":
      return typeof value === "number" ? formatNumber(value) : String(value);
    case "date":
      return formatDate(value);
    case "id":
    case "title":
    case "status":
    case "rating":
    case "long-text":
    case "text":
    default:
      return String(value);
  }
}

/** Pick a Tailwind class set for a status value — heuristic by keyword. */
export function statusTone(value: unknown): { bg: string; fg: string } {
  const s = String(value ?? "").toLowerCase();
  if (/đạt|active|done|complete|hoàn thành|✓|ok/.test(s)) {
    return { bg: "bg-emerald-100 dark:bg-emerald-950/40", fg: "text-emerald-700 dark:text-emerald-300" };
  }
  if (/cảnh báo|warn|sắp hết|trễ/.test(s)) {
    return { bg: "bg-amber-100 dark:bg-amber-950/40", fg: "text-amber-700 dark:text-amber-300" };
  }
  if (/trả|fail|hủy|hong|lỗi/.test(s)) {
    return { bg: "bg-rose-100 dark:bg-rose-950/40", fg: "text-rose-700 dark:text-rose-300" };
  }
  if (/^b[1-9]/.test(s) || /b[1-9]\s*-/.test(s)) {
    // Workflow steps B1-B9
    return { bg: "bg-blue-100 dark:bg-blue-950/40", fg: "text-blue-700 dark:text-blue-300" };
  }
  return { bg: "bg-slate-100 dark:bg-slate-900", fg: "text-slate-700 dark:text-slate-300" };
}
