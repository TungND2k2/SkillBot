"use client";
import React, { useState } from "react";

/**
 * Nút "Xuất Excel" trên trang danh sách Đơn hàng (Orders).
 * Hỗ trợ giao diện Enterprise ERP Popover với bộ lọc khoảng thời gian, thị trường, khoảng giá trị.
 */
export default function OrdersExportButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (country) params.set("country", country);
    if (minTotal) params.set("minTotal", minTotal);
    if (maxTotal) params.set("maxTotal", maxTotal);
    return `/api/orders-export?${params.toString()}`;
  };

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          color: "#e2e8f0",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "5px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s ease",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>Xuất Excel</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            background: "#0d111a",
            color: "#f8fafc",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 10,
            width: 320,
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid rgb(var(--theme-elevation-150))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Bộ Lọc Xuất Dữ Liệu</span>
            <span style={{ fontSize: 11, color: "rgb(var(--theme-elevation-400))", fontWeight: 500 }}>
              XLSX / CSV
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={labelStyle}>
                Từ ngày
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Đến ngày
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={labelStyle}>
              Thị trường / Quốc gia
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="VD: Japan, USA, Việt Nam..."
                style={inputStyle}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={labelStyle}>
                Giá trị từ ($)
                <input
                  type="number"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  placeholder="Min"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Đến ($)
                <input
                  type="number"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  placeholder="Max"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 10, borderTop: "1px solid rgb(var(--theme-elevation-150))" }}>
              <a
                href={buildUrl()}
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                }}
              >
                Tải Xuống File Excel
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "rgb(var(--theme-elevation-100))",
                  color: "rgb(var(--theme-elevation-800))",
                  border: "1px solid rgb(var(--theme-elevation-150))",
                  padding: "8px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  color: "rgb(var(--theme-elevation-500))",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 10px",
  fontSize: "12.5px",
  border: "1px solid rgb(var(--theme-elevation-200))",
  borderRadius: 6,
  background: "rgb(var(--theme-elevation-0))",
  color: "rgb(var(--theme-elevation-900))",
  outline: "none",
  fontFamily: "inherit",
};
