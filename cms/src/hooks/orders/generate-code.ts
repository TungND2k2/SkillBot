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

  // Mã đơn LUÔN là PE+số, dùng 1 counter chung. KHÔNG lấy từ brandCode (Mã DA)
  // vì Mã DA là mã mô tả tự do (khách/nước/SL/sales) — ghép vào sẽ ra mã đơn
  // dạng "Cici's closet 4/USA/198pcs/ANNTT1" như lỗi từng gặp.
  const prefix = process.env.ORDER_CODE_PREFIX?.trim() || "PE";
  const seq = await nextSeq(req.payload, `orders:${prefix}`);
  data.orderCode = `${prefix}${seq}`;
  return data;
};
