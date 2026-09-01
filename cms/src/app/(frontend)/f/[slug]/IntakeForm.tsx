"use client";

import { useEffect, useState, type FormEvent } from "react";

type LinkState = "loading" | "pending" | "gone" | "done";

const inputCls =
  "w-full h-11 rounded-lg border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
const labelCls = "text-sm font-medium text-neutral-800";

export function IntakeForm({ slug }: { slug: string }) {
  const [state, setState] = useState<LinkState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/order-intake/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { status: string }) => {
        setState(data.status === "pending" ? "pending" : "gone");
      })
      .catch(() => setState("gone"));
  }, [slug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch(`/api/order-intake/${slug}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Lỗi ${res.status}`);
      }
      setOrderCode(json.orderCode ?? null);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return <Shell>Đang tải…</Shell>;
  }

  if (state === "gone") {
    return (
      <Shell>
        <p className="text-neutral-700">
          Link này đã hết hạn hoặc đã được dùng để tạo đơn rồi. Nhắn lại bot Telegram để lấy link mới.
        </p>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell>
        <div className="text-center space-y-2">
          <div className="text-4xl">✅</div>
          <p className="text-lg font-semibold">Đã tạo đơn thành công</p>
          {orderCode && <p className="text-neutral-600">Mã đơn: {orderCode}</p>}
          <p className="text-sm text-neutral-500">Bot đã báo lại cho người yêu cầu trên Telegram.</p>
        </div>
      </Shell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell wide>
      <h1 className="text-xl font-semibold mb-1">Tạo đơn hàng mới</h1>
      <p className="text-sm text-neutral-500 mb-6">Điền thông tin B1 — Nhận đơn. Các trường có * là bắt buộc.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày đặt *">
            <input className={inputCls} type="date" name="orderDate" defaultValue={today} required />
          </Field>
          <Field label="Mã thương hiệu *">
            <input className={inputCls} type="text" name="brandCode" defaultValue="PE" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quốc gia khách *">
            <input className={inputCls} type="text" name="country" required />
          </Field>
          <Field label="Tên khách hàng / Brand *">
            <input className={inputCls} type="text" name="customerName" required />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Tổng giá trị (USD) *">
            <input className={inputCls} type="number" min={0} step="0.01" name="totalAmount" required />
          </Field>
          <Field label="Đặt cọc (USD)">
            <input className={inputCls} type="number" min={0} step="0.01" name="deposit" defaultValue={0} />
          </Field>
          <Field label="Tổng số lượng">
            <input className={inputCls} type="number" min={0} name="totalQuantity" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Hạn giao *">
            <input className={inputCls} type="date" name="expectedDeliveryDate" required />
          </Field>
          <Field label="Phí ship (USD)">
            <input className={inputCls} type="number" min={0} step="0.01" name="shippingFee" defaultValue={0} />
          </Field>
          <Field label="Trọng lượng dự kiến (kg)">
            <input className={inputCls} type="number" min={0} step="0.1" name="expectedWeightKg" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Hoá đơn (PDF/ảnh) *">
            <input className={inputCls + " py-2"} type="file" name="invoiceFile" accept="image/*,application/pdf" required />
          </Field>
          <Field label="Đề bài (PDF/ảnh) *">
            <input className={inputCls + " py-2"} type="file" name="briefFile" accept="image/*,application/pdf" required />
          </Field>
        </div>

        <Field label="Ảnh khách xác nhận (tuỳ chọn)">
          <input className={inputCls + " py-2"} type="file" name="customerConfirmationImage" accept="image/*" />
        </Field>

        <Field label="Ghi chú">
          <textarea className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" name="notes" rows={3} />
        </Field>

        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Đang gửi…" : "Tạo đơn hàng"}
        </button>
      </form>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} bg-white rounded-2xl shadow-sm border border-neutral-200 p-8`}>
        {children}
      </div>
    </main>
  );
}
