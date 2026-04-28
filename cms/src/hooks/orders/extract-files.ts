/**
 * Hook chạy sau khi Order được save: nếu có file mới (invoice/brief/
 * confirmationImage) chưa được AI xử lý, gọi bot's extract/verify API
 * trong background, rồi update lại doc.
 *
 * Async (không block save), update qua `payload.update` với
 * `disableHooks: false` để các hook khác (compute, gate) vẫn chạy.
 *
 * Lý do tách ra hook riêng: Payload hooks chạy synchronous trong request
 * — nếu await AI extract (~3-10s) thì user sẽ chờ lâu khi save. Tốt hơn
 * fire-and-forget rồi update khi xong.
 */
import type { CollectionAfterChangeHook } from "payload";
import { botClient } from "../../lib/bot-client";

interface MediaDoc {
  id: string;
  url?: string;
  filename?: string;
  mimeType?: string;
}

function mediaUrl(m: unknown, fallbackBase = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001"): string | null {
  if (!m || typeof m !== "object") return null;
  const md = m as MediaDoc;
  if (!md.url) return null;
  if (md.url.startsWith("http")) return md.url;
  return `${fallbackBase.replace(/\/$/, "")}${md.url}`;
}

function mediaName(m: unknown): string {
  if (m && typeof m === "object") {
    const md = m as MediaDoc;
    if (md.filename) return md.filename;
  }
  return "file";
}

function mediaType(m: unknown): string | undefined {
  if (m && typeof m === "object") {
    const md = m as MediaDoc;
    return md.mimeType;
  }
  return undefined;
}

/**
 * Sau khi save: kick off extraction + verification ở background, không
 * await. Mỗi tác vụ độc lập; nếu một cái fail (vd Anthropic key chưa set)
 * → log warn, không vỡ luồng.
 */
export const extractFilesAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (operation !== "create" && operation !== "update") return doc;

  const orderId = doc.id as string;

  const invoiceChanged = doc.invoiceFile && doc.invoiceFile !== previousDoc?.invoiceFile;
  const briefChanged = doc.briefFile && doc.briefFile !== previousDoc?.briefFile;
  const imageChanged = doc.customerConfirmationImage && doc.customerConfirmationImage !== previousDoc?.customerConfirmationImage;

  if (!invoiceChanged && !briefChanged && !imageChanged) return doc;

  // Fire-and-forget — return original doc immediately.
  void (async () => {
    try {
      const updates: Record<string, unknown> = {};

      // Need to fetch populated media docs since hook receives just IDs
      const populated = await req.payload.findByID({
        collection: "orders",
        id: orderId,
        depth: 1,
        overrideAccess: true,
      });

      if (invoiceChanged && populated.invoiceFile) {
        const url = mediaUrl(populated.invoiceFile);
        if (url) {
          try {
            const data = await botClient.extractInvoice(url, mediaName(populated.invoiceFile));
            updates.invoiceData = data;
          } catch (e) {
            req.payload.logger.warn(`extractInvoice failed: ${e}`);
          }
        }
      }

      if (briefChanged && populated.briefFile) {
        const url = mediaUrl(populated.briefFile);
        if (url) {
          try {
            const data = await botClient.extractBrief(url, mediaName(populated.briefFile));
            updates.briefData = data;
          } catch (e) {
            req.payload.logger.warn(`extractBrief failed: ${e}`);
          }
        }
      }

      // After both invoiceData and briefData are present, run compare.
      const finalInvoiceData = updates.invoiceData ?? populated.invoiceData;
      const finalBriefData = updates.briefData ?? populated.briefData;
      if (finalInvoiceData && finalBriefData) {
        try {
          const cmp = await botClient.compare(finalInvoiceData, finalBriefData);
          updates.documentMatch = {
            status: cmp.status,
            qtyMatch: cmp.qtyMatch,
            sizeMatch: cmp.sizeMatch,
            descMatchPercent: cmp.descMatchPercent,
            salesConfirmedMismatch:
              (populated.documentMatch as { salesConfirmedMismatch?: boolean } | undefined)?.salesConfirmedMismatch ?? false,
          };
        } catch (e) {
          req.payload.logger.warn(`compare failed: ${e}`);
        }
      }

      if (imageChanged && populated.customerConfirmationImage) {
        const url = mediaUrl(populated.customerConfirmationImage);
        const mt = mediaType(populated.customerConfirmationImage);
        if (url) {
          try {
            const v = await botClient.verifyImage(url, mt);
            updates.confirmationVerified = v.isValid ? "valid" : "invalid";
          } catch (e) {
            req.payload.logger.warn(`verifyImage failed: ${e}`);
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await req.payload.update({
          collection: "orders",
          id: orderId,
          data: updates,
          overrideAccess: true,
          context: { skipExtractHook: true } as Record<string, unknown>,
        });
        req.payload.logger.info(`Order ${orderId} AI updates: ${Object.keys(updates).join(", ")}`);
      }
    } catch (err) {
      req.payload.logger.error(`extract-files hook failed: ${err}`);
    }
  })();

  return doc;
};
