/**
 * Public, KHÔNG cần đăng nhập — endpoint cho link tạo đơn (OrderIntakeLinks).
 *
 * GET  /api/order-intake/:slug   → { status: "pending"|"submitted"|"expired" }
 * POST /api/order-intake/:slug   → multipart/form-data, tạo Order B1 + Customer
 *   (tìm/tạo theo tên) + upload file, đánh dấu link đã dùng, báo lại bot.
 *
 * Mọi thao tác đọc/ghi ở đây dùng `overrideAccess: true` vì đây là route
 * public duy nhất được phép ghi các collection này thay mặt hệ thống —
 * KHÔNG mở access public trên chính các collection.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { botClient } from "../../../../../lib/bot-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LinkDoc {
  id: string;
  slug: string;
  status: "pending" | "submitted" | "expired";
  expiresAt?: string;
  requestedByChatId: number;
}

async function findLink(payload: Awaited<ReturnType<typeof getPayload>>, slug: string): Promise<LinkDoc | null> {
  const res = await payload.find({
    collection: "order-intake-links",
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });
  return (res.docs[0] as LinkDoc | undefined) ?? null;
}

function isExpired(link: LinkDoc): boolean {
  if (link.status !== "pending") return true;
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return true;
  return false;
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await ctx.params;
  const payload = await getPayload({ config });
  const link = await findLink(payload, slug);
  if (!link) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json({ status: isExpired(link) ? "expired" : "pending" });
}

async function fileFromForm(
  form: FormData,
  field: string,
): Promise<{ data: Buffer; mimetype: string; name: string; size: number } | null> {
  const f = form.get(field);
  if (!(f instanceof File) || f.size === 0) return null;
  const buf = Buffer.from(await f.arrayBuffer());
  return { data: buf, mimetype: f.type || "application/octet-stream", name: f.name, size: buf.length };
}

function str(form: FormData, field: string): string {
  const v = form.get(field);
  return typeof v === "string" ? v.trim() : "";
}

function num(form: FormData, field: string): number | undefined {
  const v = str(form, field);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await ctx.params;
  const payload = await getPayload({ config });

  const link = await findLink(payload, slug);
  if (!link) return Response.json({ error: "not-found" }, { status: 404 });
  if (isExpired(link)) return Response.json({ error: "expired" }, { status: 410 });

  const form = await req.formData();

  const orderDate = str(form, "orderDate");
  const brandCode = str(form, "brandCode") || "PE";
  const country = str(form, "country");
  const customerName = str(form, "customerName");
  const totalAmount = num(form, "totalAmount");
  const expectedDeliveryDate = str(form, "expectedDeliveryDate");

  if (!orderDate || !country || !customerName || totalAmount === undefined || !expectedDeliveryDate) {
    return Response.json({ error: "missing-required-fields" }, { status: 400 });
  }

  const invoiceFile = await fileFromForm(form, "invoiceFile");
  const briefFile = await fileFromForm(form, "briefFile");
  if (!invoiceFile || !briefFile) {
    return Response.json({ error: "missing-files" }, { status: 400 });
  }
  const confirmationImage = await fileFromForm(form, "customerConfirmationImage");

  try {
    const invoiceMedia = await payload.create({
      collection: "media",
      data: { uploadedFrom: "api", alt: `Hoá đơn — ${customerName}` },
      file: invoiceFile,
      overrideAccess: true,
    });
    const briefMedia = await payload.create({
      collection: "media",
      data: { uploadedFrom: "api", alt: `Đề bài — ${customerName}` },
      file: briefFile,
      overrideAccess: true,
    });
    const confirmationMedia = confirmationImage
      ? await payload.create({
          collection: "media",
          data: { uploadedFrom: "api", alt: `Ảnh xác nhận — ${customerName}` },
          file: confirmationImage,
          overrideAccess: true,
        })
      : null;

    // Tìm khách theo tên (không phân biệt hoa/thường); không có thì tạo mới
    // kèm SĐT/email/social nếu người điền có cung cấp.
    const existingCustomer = await payload.find({
      collection: "customers",
      where: { name: { equals: customerName } },
      limit: 1,
      overrideAccess: true,
    });
    const customer =
      existingCustomer.docs[0] ??
      (await payload.create({
        collection: "customers",
        data: {
          name: customerName,
          country,
          phone: str(form, "customerPhone") || undefined,
          email: str(form, "customerEmail") || undefined,
          social: str(form, "customerSocial") || undefined,
        },
        overrideAccess: true,
      }));

    const order = await payload.create({
      collection: "orders",
      data: {
        orderDate,
        brandCode,
        country,
        customer: customer.id,
        invoiceFile: invoiceMedia.id,
        briefFile: briefMedia.id,
        totalAmount,
        deposit: num(form, "deposit") ?? 0,
        totalQuantity: num(form, "totalQuantity"),
        expectedDeliveryDate,
        shippingFee: num(form, "shippingFee") ?? 0,
        expectedWeightKg: num(form, "expectedWeightKg"),
        customerConfirmationImage: confirmationMedia?.id,
        notes: str(form, "notes") || undefined,
        status: "b1",
      },
      overrideAccess: true,
    });

    await payload.update({
      collection: "order-intake-links",
      id: link.id,
      data: { status: "submitted", orderId: order.id },
      overrideAccess: true,
    });

    const orderCode = (order as unknown as { orderCode?: string }).orderCode ?? order.id;
    void botClient
      .notifyOrderCreated(
        link.requestedByChatId,
        `✅ Đơn hàng ${orderCode} (${customerName}) đã được tạo xong từ link bạn gửi.`,
      )
      .catch((e) => payload.logger.warn(`notifyOrderCreated failed: ${e}`));

    return Response.json({ ok: true, orderCode });
  } catch (e) {
    payload.logger.error(`order-intake submit failed: ${e}`);
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "create-failed", message: msg }, { status: 500 });
  }
}
