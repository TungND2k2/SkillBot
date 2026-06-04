/**
 * Xuất Excel (CSV UTF-8 BOM) cho Orders.
 *
 * GET /api/orders-export?from=YYYY-MM-DD&to=YYYY-MM-DD&country=Japan
 *   &minTotal=1000000&maxTotal=50000000&status=b1
 *
 * Cần đăng nhập (Payload session). Filter áp lên `where` của payload.find.
 * Output text/csv với BOM ﻿ để Excel hiểu UTF-8 không hỏi encoding.
 */
import { getPayload, type Where } from "payload";
import config from "@payload-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request): Promise<Response> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams;

  // Build where filter
  const where: Where = {};
  const and: Where[] = [];

  const from = q.get("from");
  const to = q.get("to");
  if (from) and.push({ orderDate: { greater_than_equal: from } });
  if (to) and.push({ orderDate: { less_than_equal: to } });

  const country = q.get("country");
  if (country) and.push({ country: { equals: country } });

  const minTotal = q.get("minTotal");
  const maxTotal = q.get("maxTotal");
  if (minTotal) and.push({ totalAmount: { greater_than_equal: Number(minTotal) } });
  if (maxTotal) and.push({ totalAmount: { less_than_equal: Number(maxTotal) } });

  const status = q.get("status");
  if (status) and.push({ status: { equals: status } });

  if (and.length > 0) where.and = and;

  const result = await payload.find({
    collection: "orders",
    where,
    depth: 1,
    limit: 0, // tất cả
    user,
    overrideAccess: false,
  });

  const headers = [
    "Ngày đặt",
    "Mã DA",
    "Mã đơn",
    "Khách",
    "Quốc gia",
    "Số lượng",
    "Tổng giá trị ($)",
    "Đặt cọc ($)",
    "Còn nợ ($)",
    "Hạn giao",
    "Trạng thái",
  ];

  const rows = result.docs.map((d) => {
    const o = d as Record<string, unknown>;
    const customer = o.customer as { name?: string; companyName?: string } | string | undefined;
    const customerName =
      typeof customer === "string"
        ? customer
        : customer?.name ?? customer?.companyName ?? "";
    return [
      fmtDate(o.orderDate),
      o.brandCode ?? "",
      o.orderCode ?? "",
      customerName,
      o.country ?? "",
      o.totalQuantity ?? "",
      o.totalAmount ?? "",
      o.deposit ?? "",
      o.owedAmount ?? "",
      fmtDate(o.expectedDeliveryDate),
      o.status ?? "",
    ];
  });

  const csv =
    "﻿" +
    [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
