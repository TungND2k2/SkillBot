import type { CollectionBeforeChangeHook } from "payload";

/** owedAmount = totalAmount - deposit (clamp >= 0). */
export const computeOrderTotals: CollectionBeforeChangeHook = ({ data }) => {
  const total = Number(data.totalAmount ?? 0);
  const deposit = Number(data.deposit ?? 0);
  data.owedAmount = Math.max(0, total - deposit);
  return data;
};
