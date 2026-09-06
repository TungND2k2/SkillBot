"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getOrderAlertStatus } from "../../lib/workflow-stages";

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
  stageStartedAt?: string;
  updatedAt?: string;
  managerConfirmed?: boolean;
  b1ManagerConfirmed?: boolean;
  b2ManagerConfirmed?: boolean;
  b3ManagerConfirmed?: boolean;
  b4ManagerConfirmed?: boolean;
  b5ManagerConfirmed?: boolean;
  b6ManagerConfirmed?: boolean;
  stageTimings?: Array<{
    stage?: string;
    startedAt?: string;
    completedAt?: string;
    updatedBy?: any;
    managerConfirmed?: boolean;
    notes?: string;
  }>;
}

interface OrderSlideDrawerProps {
  order: OrderData | null;
  onClose: () => void;
}

const STAGES = [
  { key: "b1", label: "B1: Nhận đơn (1-2d)" },
  { key: "b2", label: "B2: Định mức BOM (1-4d)" },
  { key: "b3", label: "B3: Mua NPL (3-7d)" },
  { key: "b4", label: "B4: Gửi NCC (1d)" },
  { key: "b5", label: "B5: Thêu & May (24-35d)" },
  { key: "b6", label: "B6: QC & Đóng gói (1-3d)" },
];

const STATUS_ORDER = ["b1", "b2", "b3", "b4", "b5", "b6", "done"];

export const OrderSlideDrawer: React.FC<OrderSlideDrawerProps> = ({ order, onClose }) => {
  const [managerConfirming, setManagerConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!order) return null;

  const custName = typeof order.customer === "object" ? order.customer?.name : "—";
  const custPhone = typeof order.customer === "object" ? order.customer?.phone : "";
  const custEmail = typeof order.customer === "object" ? order.customer?.email : "";

  const currentIdx = STATUS_ORDER.indexOf(order.status || "b1");
  const alert = getOrderAlertStatus(order);

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
  const fmtMoney = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");

  // Quick manager confirmation handler
  const handleManagerApproveCurrentStep = async () => {
    if (!order.status || order.status === "done") return;
    setManagerConfirming(true);
    try {
      const fieldName = `${order.status}ManagerConfirmed`;
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          [fieldName]: true,
          managerConfirmed: true,
        }),
      });
      if (res.ok) {
        setConfirmed(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManagerConfirming(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(6px)",
          zIndex: 9998,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Slide Drawer */}
      <div
        className="sb-slide-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "480px",
          maxWidth: "92vw",
          background: "#080d1a",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "-16px 0 50px rgba(0, 0, 0, 0.7)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 520px) {
            .sb-slide-drawer {
              width: 100vw !important;
              max-width: 100vw !important;
            }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "#050811",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#ffffff", fontFamily: "var(--font-mono, monospace)" }}>
                {order.orderCode || `#${order.id?.slice(-6)}`}
              </h3>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {order.status?.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Mã DA: <strong style={{ color: "#e2e8f0" }}>{order.brandCode || "—"}</strong> · Ngày tạo: {fmtDate(order.orderDate)}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng ngăn chi tiết"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Alert Status Banner */}
          {alert.level !== "normal" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: alert.badgeBg,
                border: `1px solid ${alert.badgeBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: alert.color,
                  boxShadow: `0 0 10px ${alert.color}`,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: alert.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {alert.label}
                </div>
                <div style={{ fontSize: "12px", color: "#f1f5f9", marginTop: "2px" }}>
                  {alert.message}
                </div>
              </div>
            </div>
          )}

          {/* Quick Financial Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "10px",
              padding: "14px",
              borderRadius: "10px",
              background: "#050811",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Tổng tiền</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#38bdf8", marginTop: "3px", fontFamily: "var(--font-mono, monospace)" }}>
                {fmtMoney(order.totalAmount)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Đã cọc</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#34d399", marginTop: "3px", fontFamily: "var(--font-mono, monospace)" }}>
                {fmtMoney(order.deposit)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Còn nợ</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: (order.owedAmount || 0) > 0 ? "#fbbf24" : "#34d399", marginTop: "3px", fontFamily: "var(--font-mono, monospace)" }}>
                {fmtMoney(order.owedAmount)}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Section */}
          <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>
              Khách Hàng & Giao Hàng
            </h4>
            <div style={{ display: "grid", gap: "9px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Khách hàng:</span>
                <strong style={{ color: "#ffffff" }}>{custName}</strong>
              </div>
              {custPhone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Điện thoại:</span>
                  <span style={{ color: "#f8fafc", fontFamily: "var(--font-mono, monospace)" }}>{custPhone}</span>
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
                <span style={{ color: "#94a3b8" }}>Hạn giao hàng (TAT):</span>
                <strong style={{ color: alert.color }}>{fmtDate(order.expectedDeliveryDate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Số lượng sản xuất:</span>
                <strong style={{ color: "#ffffff" }}>{order.totalQuantity?.toLocaleString() || 0} SP</strong>
              </div>
            </div>
          </div>

          {/* 6-Step Production Stages Progress */}
          <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Tiến Độ 6 Bước Sản Xuất
              </h4>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Tuần tự</span>
            </div>

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
                      background: isCurrent ? "rgba(56, 189, 248, 0.08)" : "rgba(0, 0, 0, 0.2)",
                      border: isCurrent ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: isCurrent ? 700 : 500, color: isPassed ? "#34d399" : isCurrent ? "#ffffff" : "#64748b", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {isPassed ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span style={{ width: 12, display: "inline-block", textAlign: "center", fontSize: 11, color: "#64748b" }}>{idx + 1}</span>
                      )}
                      {s.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: isPassed ? "#34d399" : isCurrent ? "#38bdf8" : "#64748b",
                      }}
                    >
                      {isPassed ? "Hoàn tất" : isCurrent ? "Đang xử lý" : "Chờ"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manager Quick Override Action */}
          {order.status && order.status !== "done" && (
            <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Quyền Quản Lý Xác Nhận Bước
                  </h4>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0 0" }}>
                    Duyệt nhanh bước {order.status.toUpperCase()} không bắt buộc file
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManagerApproveCurrentStep}
                  disabled={managerConfirming || confirmed}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    background: confirmed ? "#059669" : "#2563eb",
                    color: "#ffffff",
                    border: 0,
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: confirmed ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {confirmed ? "Đã Duyệt" : managerConfirming ? "Đang lưu..." : "Duyệt Bước Này"}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px 0" }}>
                Ghi Chú Sản Xuất
              </h4>
              <p style={{ fontSize: "12px", color: "#cbd5e1", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "#050811",
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
              padding: "9px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>Mở Toàn Bộ Chi Tiết & Chỉnh Sửa</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </Link>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
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
