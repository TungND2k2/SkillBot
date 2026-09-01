"use client";

import React, { useEffect, useState } from "react";
import OrdersExportButton from "./OrdersExportButton";
import OrdersKanbanBoard from "./OrdersKanbanBoard";
import { getOrderAlertStatus } from "../../lib/workflow-stages";

export const OrdersListToolbar: React.FC = () => {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [stats, setStats] = useState({
    totalOrders: 0,
    activePipeline: 0,
    approachingCount: 0,
    overdueCount: 0,
    criticalOverdueCount: 0,
    stalledCount: 0,
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
        let approaching = 0;
        let overdue = 0;
        let critical = 0;
        let stalled = 0;

        for (const o of docs) {
          revenue += o.totalAmount || 0;
          owed += o.owedAmount || 0;
          if (["b1", "b2", "b3", "b4", "b5", "b6"].includes(o.status)) {
            active += 1;
          }

          const alert = getOrderAlertStatus(o);
          if (alert.level === "approaching") approaching += 1;
          else if (alert.level === "overdue") overdue += 1;
          else if (alert.level === "critical_overdue") critical += 1;
          else if (alert.level === "stalled") stalled += 1;
        }

        if (!cancel) {
          setStats({
            totalOrders: docs.length,
            activePipeline: active,
            approachingCount: approaching,
            overdueCount: overdue,
            criticalOverdueCount: critical,
            stalledCount: stalled,
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
      {/* 4 Alert Cards Ribbon */}
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
            borderLeft: "3.5px solid #eab308",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            🟡 Sắp Đến Hạn (≤ 7 ngày)
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#facc15", marginTop: "2px", fontFamily: "monospace" }}>
            {stats.approachingCount} Đơn
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Cần ưu tiên KCS & đóng gói
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #f87171",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            🔴 Đơn Muộn (1–14 ngày)
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#f87171", marginTop: "2px", fontFamily: "monospace" }}>
            {stats.overdueCount} Đơn
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Thúc tiến độ khẩn cấp
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #ef4444",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            🔴 Trễ Nghiêm Trọng (&gt; 14 ngày)
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#ef4444", marginTop: "2px", fontFamily: "monospace" }}>
            {stats.criticalOverdueCount} Đơn
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Báo cáo giám đốc xử lý
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "3.5px solid #f97316",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            🟠 Cần Xử Lý (Kẹt bước)
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#fb923c", marginTop: "2px", fontFamily: "monospace" }}>
            {stats.stalledCount} Đơn
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Quá 7 ngày SLA không cập nhật
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
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Doanh số: <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{fmtMoney(stats.totalRevenue)}</strong> ·
            Công nợ: <strong style={{ color: "#fbbf24", fontFamily: "monospace" }}>{fmtMoney(stats.totalOwed)}</strong>
          </span>
          <OrdersExportButton />
        </div>
      </div>

      {/* Render Kanban View when selected */}
      {viewMode === "kanban" && <OrdersKanbanBoard />}
    </div>
  );
};

export default OrdersListToolbar;
