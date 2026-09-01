/** Simple text helpers used across tool result rendering. */
import type { PayloadDoc } from "../payload/types.js";
import { getConfig } from "../config.js";

/**
 * Link cho user bấm vào xem chi tiết 1 bản ghi — trỏ vào Payload admin
 * (khớp phiên đăng nhập /admin user đã có sẵn, không cần login riêng
 * như portal — portal dùng JWT/localStorage tách biệt hoàn toàn).
 */
export function docLink(slug: string, id: string): string {
  const base = getConfig().PUBLIC_FORM_BASE_URL.replace(/\/$/, "");
  return `${base}/admin/collections/${slug}/${id}`;
}

/** Format a list of docs into a compact human-readable summary for Claude. */
export function formatList(docs: PayloadDoc[], titleField: string = "id", slug?: string): string {
  if (docs.length === 0) return "(không có kết quả)";
  return docs
    .map((d, i) => {
      const title = String(d[titleField] ?? "—");
      const link = slug ? ` — ${docLink(slug, String(d.id))}` : ` (#${d.id})`;
      return `${i + 1}. ${title}${link}`;
    })
    .join("\n");
}

/** Render full document detail. Strips internal Payload fields. */
export function formatDoc(doc: PayloadDoc, slug?: string): string {
  const skip = new Set(["id", "createdAt", "updatedAt", "_id", "__v"]);
  const lines = [slug ? `🔗 ${docLink(slug, String(doc.id))}` : `#${doc.id}`];
  for (const [k, v] of Object.entries(doc)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object") {
      lines.push(`  ${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`  ${k}: ${v}`);
    }
  }
  lines.push(`  (cập nhật: ${doc.updatedAt})`);
  return lines.join("\n");
}
