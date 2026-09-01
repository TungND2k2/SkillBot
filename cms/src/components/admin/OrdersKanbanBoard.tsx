"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { OrderSlideDrawer, OrderData } from "./OrderSlideDrawer";
import { getOrderAlertStatus } from "../../lib/workflow-stages";

const COLUMNS = [
  { key: "b1", label: "B1: Nhận đơn (1-2d)", color: "#3b82f6" },
  { key: "b2", label: "B2: Định mức (1-4d)", color: "#6366f1" },
  { key: "b3", label: "B3: Mua NPL (3-7d)", color: "#8b5cf6" },
  { key: "b4", label: "B4: Gửi NCC (1d)", color: "#ec4899" },
  { key: "b5", label: "B5: Thêu & May (24-35d)", color: "#f59e0b" },
  { key: "b6", label: "B6: QC & Giao (1-3d)", color: "#10b981" },
];

export const OrdersKanbanBoard: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?limit=300&depth=1&sort=-createdAt", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.docs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const alert = getOrderAlertStatus(o);
    if (alertFilter !== "all" && alert.level !== alertFilter) return false;

    if (!search) return true;
    const s = search.toLowerCase();
    const code = o.orderCode?.toLowerCase() || "";
    const brand = o.brandCode?.toLowerCase() || "";
    const cust = typeof o.customer === "object" ? o.customer?.name?.toLowerCase() || "" : "";
    return code.includes(s) || brand.includes(s) || cust.includes(s);
  });

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
  const fmtMoney = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");

  return (
    <div style={{ marginTop: "12px", marginBottom: "24px" }}>
      {/* Board Controls & Alert Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "600px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 Tìm nhanh theo mã đơn, mã DA, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid #1e293b",
              color: "#f8fafc",
              fontSize: "12.5px",
              outline: "none",
              minWidth: "220px",
            }}
          />

          {/* Quick Alert Filter */}
          <select
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid #1e293b",
              color: "#cbd5e1",
              fontSize: "12px",
              outline: "none",
            }}
          >
            <option value="all">⚡ Tất cả cảnh báo ({orders.length})</option>
            <option value="approaching">🟡 Sắp đến hạn (≤ 7 ngày)</option>
            <option value="overdue">🔴 Đơn muộn (1–14 ngày)</option>
            <option value="critical_overdue">🔴 Trễ nghiêm trọng (&gt; 14 ngày)</option>
            <option value="stalled">🟠 Cần xử lý (Kẹt bước)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={fetchOrders}
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              color: "#94a3b8",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            🔄 Làm mới ({filteredOrders.length} đơn)
          </button>
          <Link
            href="/admin/collections/orders/create"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              border: "1px solid #3b82f6",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
          >
            ➕ Tạo Đơn
          </Link>
        </div>
      </div>

      {/* 6-Column Kanban Grid */}
      {loading ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "#94a3b8",
            background: "#0f172a",
            borderRadius: "12px",
            border: "1px solid #1e293b",
            fontSize: "13px",
          }}
        >
          Đang tải dữ liệu luồng sản xuất Kanban...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(240px, 1fr))",
            gap: "14px",
            overflowX: "auto",
            paddingBottom: "16px",
          }}
        >
          {COLUMNS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.key);
            return (
              <div
                key={col.key}
                style={{
                  background: "#090d16",
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "480px",
                  overflow: "hidden",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#0d1422",
                    borderBottom: "1px solid #1e293b",
                    borderTop: `3px solid ${col.color}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>{col.label}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                    }}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div
                  style={{
                    padding: "10px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    overflowY: "auto",
                  }}
                >
                  {colOrders.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 10px",
                        color: "#475569",
                        fontSize: "11.5px",
                        border: "1px dashed #1e293b",
                        borderRadius: "8px",
                      }}
                    >
                      Không có đơn ở bước này
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const custName = typeof order.customer === "object" ? order.customer?.name : "—";
                      const alert = getOrderAlertStatus(order);

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            background: "#0f172a",
                            border: `1px solid ${alert.level !== "normal" ? alert.badgeBorder : "#1e293b"}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = col.color;
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = alert.level !== "normal" ? alert.badgeBorder : "#1e293b";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* Alert Badge Header */}
                          {alert.level !== "normal" && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: alert.badgeBg,
                                color: alert.color,
                                border: `1px solid ${alert.badgeBorder}`,
                                marginBottom: "8px",
                              }}
                            >
                              {alert.label}: {alert.message}
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8", fontFamily: "monospace" }}>
                              {order.orderCode || `#${order.id?.slice(-6)}`}
                            </span>
                            {order.brandCode && (
                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "#1e293b", color: "#cbd5e1", fontWeight: 600 }}>
                                {order.brandCode}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {custName}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
                            <span>SL: <strong style={{ color: "#ffffff" }}>{order.totalQuantity?.toLocaleString() || 0}</strong></span>
                            <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>{fmtMoney(order.totalAmount)}</span>
                          </div>

                          <div
                            style={{
                              paddingTop: "6px",
                              borderTop: "1px solid #162234",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "10.5px",
                            }}
                          >
                            <span style={{ color: alert.color, fontWeight: alert.level !== "normal" ? 700 : 500 }}>
                              Hạn: {fmtDate(order.expectedDeliveryDate)}
                            </span>
                            <span style={{ color: "#3b82f6", fontWeight: 600 }}>Chi tiết ↗</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide Drawer on card click */}
      <OrderSlideDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
};

export default OrdersKanbanBoard;
