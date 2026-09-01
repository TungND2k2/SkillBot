"use client";

import React from "react";
import Link from "next/link";

export interface OrderData {
  id: string;
  orderCode?: string;
  brandCode?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  totalQuantity?: number;
  totalAmount?: number;
  deposit?: number;
  owedAmount?: number;
  status?: string;
  country?: string;
  customer?: { name?: string; phone?: string; email?: string } | string;
  salespersonCode?: string;
  notes?: string;
  customerFeedback?: string;
}

interface OrderSlideDrawerProps {
  order: OrderData | null;
  onClose: () => void;
}

const STAGES = [
  { key: "b1", label: "B1: Nhận đơn & Đề bài" },
  { key: "b2", label: "B2: Tính định mức BOM" },
  { key: "b3", label: "B3: Nhập nguyên phụ liệu" },
  { key: "b4", label: "B4: Sản xuất may & thêu" },
  { key: "b5", label: "B5: Kiểm định KCS (QC)" },
  { key: "b6", label: "B6: Đóng gói & Xuất hàng" },
];

const STATUS_ORDER = ["b1", "b2", "b3", "b4", "b5", "b6", "done"];

export const OrderSlideDrawer: React.FC<OrderSlideDrawerProps> = ({ order, onClose }) => {
  if (!order) return null;

  const custName = typeof order.customer === "object" ? order.customer?.name : "—";
  const custPhone = typeof order.customer === "object" ? order.customer?.phone : "";
  const custEmail = typeof order.customer === "object" ? order.customer?.email : "";

  const currentIdx = STATUS_ORDER.indexOf(order.status || "b1");

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
  const fmtMoney = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Slide Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "440px",
          maxWidth: "92vw",
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
          boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.6)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideInRight 0.22s ease-out",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #1e293b",
            background: "#0d1422",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#ffffff", fontFamily: "monospace" }}>
                {order.orderCode || `#${order.id?.slice(-6)}`}
              </h3>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(37, 99, 235, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  textTransform: "uppercase",
                }}
              >
                {order.status?.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "3px 0 0 0" }}>
              Mã DA: <strong>{order.brandCode || "—"}</strong> · Ngày tạo: {fmtDate(order.orderDate)}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #1e293b",
              color: "#94a3b8",
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Quick Financial Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "10px",
              padding: "12px",
              borderRadius: "10px",
              background: "#090d16",
              border: "1px solid #1e293b",
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Tổng tiền</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#38bdf8", marginTop: "2px", fontFamily: "monospace" }}>
                {fmtMoney(order.totalAmount)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Đã cọc</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#10b981", marginTop: "2px", fontFamily: "monospace" }}>
                {fmtMoney(order.deposit)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Còn nợ</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: (order.owedAmount || 0) > 0 ? "#fbbf24" : "#10b981", marginTop: "2px", fontFamily: "monospace" }}>
                {fmtMoney(order.owedAmount)}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Section */}
          <div style={{ padding: "14px", borderRadius: "10px", background: "#161f30", border: "1px solid #1e293b" }}>
            <h4 style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "0 0 10px 0" }}>
              Thông Tin Khách Hàng & Giao Hàng
            </h4>
            <div style={{ display: "grid", gap: "8px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Khách hàng:</span>
                <strong style={{ color: "#ffffff" }}>{custName}</strong>
              </div>
              {custPhone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Điện thoại:</span>
                  <span style={{ color: "#f8fafc", fontFamily: "monospace" }}>{custPhone}</span>
                </div>
              )}
              {custEmail && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Email:</span>
                  <span style={{ color: "#f8fafc" }}>{custEmail}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Quốc gia:</span>
                <span style={{ color: "#f8fafc" }}>{order.country || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Hạn giao hàng:</span>
                <strong style={{ color: "#38bdf8" }}>{fmtDate(order.expectedDeliveryDate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Số lượng sản xuất:</span>
                <strong style={{ color: "#ffffff" }}>{order.totalQuantity?.toLocaleString() || 0} SP</strong>
              </div>
            </div>
          </div>

          {/* 6-Step Production Stages Progress */}
          <div style={{ padding: "14px", borderRadius: "10px", background: "#161f30", border: "1px solid #1e293b" }}>
            <h4 style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "0 0 12px 0" }}>
              Tiến Độ 6 Bước Sản Xuất
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {STAGES.map((s, idx) => {
                const isPassed = currentIdx > idx || order.status === "done";
                const isCurrent = currentIdx === idx && order.status !== "done";
                return (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: isCurrent ? "rgba(37, 99, 235, 0.15)" : "#0f172a",
                      border: isCurrent ? "1px solid #3b82f6" : "1px solid #1e293b",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: isCurrent ? 700 : 500, color: isPassed ? "#10b981" : isCurrent ? "#ffffff" : "#64748b" }}>
                      {isPassed ? "✓ " : `${idx + 1}. `} {s.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: isPassed ? "#10b981" : isCurrent ? "#3b82f6" : "#64748b",
                      }}
                    >
                      {isPassed ? "Hoàn tất" : isCurrent ? "Đang xử lý" : "Chờ"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ padding: "14px", borderRadius: "10px", background: "#161f30", border: "1px solid #1e293b" }}>
              <h4 style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "0 0 6px 0" }}>
                Ghi Chú Sản Xuất
              </h4>
              <p style={{ fontSize: "12px", color: "#cbd5e1", margin: 0, whiteSpace: "pre-wrap" }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #1e293b",
            background: "#0d1422",
            display: "flex",
            gap: "10px",
          }}
        >
          <Link
            href={`/admin/collections/orders/${order.id}`}
            style={{
              flex: 1,
              textAlign: "center",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              padding: "9px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
          >
            Mở Toàn Bộ Chi Tiết & Chỉnh Sửa ↗
          </Link>
          <button
            onClick={onClose}
            style={{
              background: "#161f30",
              border: "1px solid #1e293b",
              color: "#cbd5e1",
              padding: "9px 16px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderSlideDrawer;
