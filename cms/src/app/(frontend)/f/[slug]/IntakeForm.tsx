"use client";

import React, { useEffect, useState, type FormEvent } from "react";

type LinkState = "loading" | "pending" | "gone" | "done";

export function IntakeForm({ slug }: { slug: string }) {
  const [state, setState] = useState<LinkState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  // Dynamic Financial Balance State
  const [totalAmount, setTotalAmount] = useState<number | string>("");
  const [deposit, setDeposit] = useState<number | string>(0);

  // File Upload State Names
  const [invoiceName, setInvoiceName] = useState<string>("");
  const [briefName, setBriefName] = useState<string>("");
  const [confirmName, setConfirmName] = useState<string>("");

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

  const numTotal = Number(totalAmount) || 0;
  const numDeposit = Number(deposit) || 0;
  const owedAmount = Math.max(0, numTotal - numDeposit);

  if (state === "loading") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #1e293b",
              borderTopColor: "#38bdf8",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>
            Đang xác thực liên kết khởi tạo đơn hàng...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Shell>
    );
  }

  if (state === "gone") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "32px 10px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "26px",
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
            Liên Kết Đã Hết Hạn
          </h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, maxWidth: "380px", margin: "0 auto" }}>
            Link này đã hết thời gian hiệu lực hoặc đã được sử dụng để tạo đơn hàng. Vui lòng nhắn lại Bot trên Telegram để nhận mã liên kết mới.
          </p>
        </div>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "36px 12px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "28px",
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", marginBottom: "6px" }}>
            Tạo Đơn Hàng Thành Công!
          </h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
            Hệ thống đã tiếp nhận dữ liệu B1 và chuyển giao sang luồng sản xuất.
          </p>

          {orderCode && (
            <div
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "#0b0f19",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                Mã đơn hàng
              </span>
              <span style={{ fontSize: "22px", fontWeight: 900, color: "#38bdf8", fontFamily: "monospace", marginTop: "2px" }}>
                {orderCode}
              </span>
            </div>
          )}

          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(37, 99, 235, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              fontSize: "12px",
              color: "#93c5fd",
            }}
          >
            🤖 Bot Telegram đã gửi thông báo và đường dẫn đối soát cho quản lý xưởng.
          </div>
        </div>
      </Shell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell wide>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", paddingBottom: "18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  letterSpacing: "0.05em",
                }}
              >
                BƯỚC 1 / 6
              </span>
              <span style={{ fontSize: "11.5px", color: "#38bdf8", fontWeight: 700 }}>
                Nhận Đơn & Đề Bài Brief
              </span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
              Khởi Tạo Đơn Hàng May Thêu
            </h1>
          </div>

          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#0b0f19",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "11px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⏳ SLA Quy định:</span>
            <strong style={{ color: "#facc15" }}>1–2 ngày</strong>
          </div>
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        {/* Section 1: Thông tin dự án & Khách hàng */}
        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            background: "#0b0f19",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px 0" }}>
            1. Thông Tin Dự Án & Khách Hàng
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <Field label="Ngày tạo đơn *">
              <input className="intake-input" type="date" name="orderDate" defaultValue={today} required />
            </Field>
            <Field label="Mã dự án / Brand *">
              <input className="intake-input" type="text" name="brandCode" defaultValue="PE" required placeholder="vd: PE / VN / JP" />
            </Field>
            <Field label="Quốc gia khách hàng *">
              <input className="intake-input" type="text" name="country" required placeholder="vd: USA, Nhật Bản, Đức..." />
            </Field>
            <Field label="Tên khách hàng / Thương hiệu *">
              <input className="intake-input" type="text" name="customerName" required placeholder="vd: Slippery Frog Smock..." />
            </Field>
            <Field label="SĐT khách hàng">
              <input className="intake-input" type="text" name="customerPhone" placeholder="vd: +84 90 xxx xxxx" />
            </Field>
            <Field label="Email khách hàng">
              <input className="intake-input" type="email" name="customerEmail" placeholder="vd: contact@brand.com" />
            </Field>
            <Field label="Link Social (FB/IG/Zalo)">
              <input className="intake-input" type="text" name="customerSocial" placeholder="vd: instagram.com/brand" />
            </Field>
          </div>
        </div>

        {/* Section 2: Quy mô sản xuất & Tài chính (Real-time Calculator) */}
        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            background: "#0b0f19",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
              2. Quy Mô Sản Xuất & Tài Chính
            </h3>
            {numTotal > 0 && (
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Còn nợ dự kiến: <strong style={{ color: owedAmount > 0 ? "#fbbf24" : "#10b981", fontFamily: "monospace" }}>${owedAmount.toLocaleString()}</strong>
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "14px" }}>
            <Field label="Tổng giá trị đơn (USD) *">
              <input
                className="intake-input"
                type="number"
                min={0}
                step="0.01"
                name="totalAmount"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
                placeholder="0.00"
              />
            </Field>
            <Field label="Khách đã đặt cọc (USD)">
              <input
                className="intake-input"
                type="number"
                min={0}
                step="0.01"
                name="deposit"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Tổng số lượng sản xuất (SP) *">
              <input className="intake-input" type="number" min={1} name="totalQuantity" required placeholder="vd: 500" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <Field label="Hạn trả hàng dự kiến (TAT) *">
              <input className="intake-input" type="date" name="expectedDeliveryDate" required />
            </Field>
            <Field label="Phí vận chuyển (USD)">
              <input className="intake-input" type="number" min={0} step="0.01" name="shippingFee" defaultValue={0} placeholder="0.00" />
            </Field>
            <Field label="Trọng lượng ước tính (kg)">
              <input className="intake-input" type="number" min={0} step="0.1" name="expectedWeightKg" placeholder="vd: 12.5" />
            </Field>
          </div>
        </div>

        {/* Section 3: Hồ sơ tài liệu & File Brief (Drag & Drop Look) */}
        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            background: "#0b0f19",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px 0" }}>
            3. Hồ Sơ Đính Kèm (Hóa Đơn & Đề Bài)
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "14px" }}>
            {/* Invoice Upload */}
            <div className="file-dropzone">
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📄</div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Hóa đơn đối soát (PDF/ảnh) *</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 8px 0" }}>
                {invoiceName || "Kéo thả hoặc bấm để chọn tệp"}
              </span>
              <input
                type="file"
                name="invoiceFile"
                accept="image/*,application/pdf"
                required
                onChange={(e) => setInvoiceName(e.target.files?.[0]?.name || "")}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>

            {/* Brief Upload */}
            <div className="file-dropzone">
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>🎨</div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Đề bài thiết kế Brief *</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 8px 0" }}>
                {briefName || "Kéo thả hoặc bấm để chọn tệp"}
              </span>
              <input
                type="file"
                name="briefFile"
                accept="image/*,application/pdf"
                required
                onChange={(e) => setBriefName(e.target.files?.[0]?.name || "")}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>

            {/* Customer Confirmation Photo */}
            <div className="file-dropzone">
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📸</div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Ảnh khách xác nhận (Tuỳ chọn)</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 8px 0" }}>
                {confirmName || "Bằng chứng chat/xác nhận mẫu"}
              </span>
              <input
                type="file"
                name="customerConfirmationImage"
                accept="image/*"
                onChange={(e) => setConfirmName(e.target.files?.[0]?.name || "")}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Ghi chú */}
        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            background: "#0b0f19",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Field label="Ghi chú & Yêu cầu kỹ thuật đặc biệt">
            <textarea
              className="intake-input"
              name="notes"
              rows={3}
              placeholder="Ghi chú thêm về quy cách thêu, loại chỉ, vị trí đóng gói..."
              style={{ height: "auto", padding: "10px 14px", resize: "vertical" }}
            />
          </Field>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            height: "48px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 800,
            border: "1px solid #3b82f6",
            boxShadow: "0 4px 20px rgba(37, 99, 235, 0.45)",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            transition: "all 0.15s ease",
            letterSpacing: "0.02em",
          }}
        >
          {submitting ? "Đang Khởi Tạo Đơn Hàng & Tải Hồ Sơ..." : "🚀 Hoàn Tất & Khởi Tạo Đơn Hàng (B1)"}
        </button>
      </form>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, 0.15) 0%, #030712 75%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: wide ? "820px" : "480px",
          background: "rgba(12, 18, 30, 0.88)",
          backdropFilter: "blur(24px)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          padding: "32px",
        }}
      >
        {/* Top Logo Monogram */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(59, 130, 246, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
              SKILLBOT <span style={{ color: "#38bdf8" }}>ERP</span>
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "-2px" }}>
              Cổng Tiếp Nhận Đơn Hàng Xuất Khẩu
            </span>
          </div>
        </div>

        {children}
      </div>

      <style>{`
        .intake-input {
          width: 100%;
          height: 42px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #060913;
          color: #f8fafc;
          font-size: 13px;
          padding: 0 12px;
          outline: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .intake-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
          background: #0a0f1d;
        }
        .file-dropzone {
          position: relative;
          border: 1.5px dashed rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 16px 12px;
          text-align: center;
          background: #060913;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .file-dropzone:hover {
          border-color: #38bdf8;
          background: rgba(37, 99, 235, 0.05);
        }
      `}</style>
    </main>
  );
}
