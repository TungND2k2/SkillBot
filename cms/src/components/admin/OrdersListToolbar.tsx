"use client";

import React, { useEffect, useState } from "react";
import OrdersExportButton from "./OrdersExportButton";
import OrdersKanbanBoard from "./OrdersKanbanBoard";

export const OrdersListToolbar: React.FC = () => {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [stats, setStats] = useState({
    totalOrders: 0,
    activePipeline: 0,
    overdueCount: 0,
    totalRevenue: 0,
    totalOwed: 0,
  });

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/orders?limit=500&depth=0", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const docs = data.docs || [];

        let revenue = 0;
        let owed = 0;
        let active = 0;
        let overdue = 0;
        const now = new Date();

        for (const o of docs) {
          revenue += o.totalAmount || 0;
          owed += o.owedAmount || 0;
          if (["b1", "b2", "b3", "b4", "b5", "b6"].includes(o.status)) {
            active += 1;
          }
          if (o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < now && o.status !== "done") {
            overdue += 1;
          }
        }

        if (!cancel) {
          setStats({
            totalOrders: docs.length,
            activePipeline: active,
            overdueCount: overdue,
            totalRevenue: revenue,
            totalOwed: owed,
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const fmtMoney = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* 4-Stat KPI Summary Ribbon (Shopify Pattern) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #3b82f6",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Tổng Doanh Số Đơn
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#38bdf8", marginTop: "2px", fontFamily: "monospace" }}>
            {fmtMoney(stats.totalRevenue)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            {stats.totalOrders} đơn trong hệ thống
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #10b981",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Đang May & Sản Xuất
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#10b981", marginTop: "2px", fontFamily: "monospace" }}>
            {stats.activePipeline} Đơn
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Trong luồng B1 → B6
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #f59e0b",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Cảnh Báo Hạn Giao
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: stats.overdueCount > 0 ? "#ef4444" : "#10b981",
              marginTop: "2px",
              fontFamily: "monospace",
            }}
          >
            {stats.overdueCount} Đơn quá hạn
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Cần thúc đẩy tiến độ
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #fbbf24",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Công Nợ Chưa Thu
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#fbbf24", marginTop: "2px", fontFamily: "monospace" }}>
            {fmtMoney(stats.totalOwed)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Kế toán theo dõi thu cọc
          </div>
        </div>
      </div>

      {/* View Switcher & Action Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "#0f172a",
          border: "1px solid #1e293b",
        }}
      >
        {/* View Mode Toggle (Directus Pattern) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#090d16", padding: "3px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: 0,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "table" ? "#2563eb" : "transparent",
              color: viewMode === "table" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            📋 Bảng Sổ Cái (Table)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: 0,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "kanban" ? "#2563eb" : "transparent",
              color: viewMode === "kanban" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            🗂 Luồng Kanban 6 Bước (Board)
          </button>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <OrdersExportButton />
        </div>
      </div>

      {/* Render Kanban View when selected */}
      {viewMode === "kanban" && <OrdersKanbanBoard />}
    </div>
  );
};

export default OrdersListToolbar;
