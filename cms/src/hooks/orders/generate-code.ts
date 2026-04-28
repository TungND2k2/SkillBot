import type { CollectionBeforeChangeHook } from "payload";
import { nextSeq } from "../next-seq";

/**
 * Sinh `orderCode` dạng "{brandCode}{N}" (vd: PE100, PE101) cho đơn mới.
 *
 * Chỉ chạy khi `operation === "create"` và chưa có orderCode (admin có
 * thể edit thủ công, nhưng khi tạo mới hệ thống tự đặt).
 */
export const generateOrderCode: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create") return data;
  if (data.orderCode) return data; // đã có (vd: import từ hệ cũ)

  const brand = (data.brandCode as string | undefined)?.trim() || "PE";
  const seq = await nextSeq(req.payload, `orders:${brand}`);
  data.orderCode = `${brand}${seq}`;
  return data;
};
