"use client";
import React, { useState } from "react";

/**
 * Nút "Xuất Excel" trên trang list Orders. Mở popover nhỏ cho phép user
 * chọn khoảng thời gian + nước + khoảng giá trị, rồi tải file CSV.
 *
 * Backend: /api/orders-export — apply where lên payload.find với access
 * theo session user (sales chỉ export đơn của mình).
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
    <div style={{ display: "inline-block", position: "relative", marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#059669",
          color: "#fff",
          border: 0,
          padding: "8px 14px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        📊 Xuất Excel
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            background: "#fff",
            color: "#111",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 14,
            width: 320,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Từ ngày
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Đến ngày
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Thị trường (nước khách)
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="vd: Japan"
                style={inputStyle}
              />
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <label style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                Giá trị từ
                <input
                  type="number"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                Đến
                <input
                  type="number"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <a
                href={buildUrl()}
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "#059669",
                  color: "#fff",
                  padding: "8px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Tải file
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "#f3f4f6",
                  color: "#111",
                  border: 0,
                  padding: "8px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 8px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontWeight: 400,
};
