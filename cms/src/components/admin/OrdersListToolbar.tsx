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

    const load = async () => {
      try {
        const res = await fetch("/api/orders?limit=500&depth=0", {
          credentials: "include",
          cache: "no-store",
        });
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
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, []);

  const fmtMoney = (n: number) => `$${n.toLocaleString()}`;

  const alertCards = [
    {
      title: "Đang Sản Xuất",
      sub: "Tổng đơn B1 → B6",
      count: stats.activePipeline,
      color: "#2563eb",
      glow: "rgba(37, 99, 235, 0.2)",
      hint: "Toàn bộ đơn đang chạy",
    },
    {
      title: "Sắp Đến Hạn",
      sub: "≤ 7 ngày trả hàng",
      count: stats.approachingCount,
      color: "#eab308",
      glow: "rgba(234, 179, 8, 0.2)",
      hint: "Ưu tiên KCS & Đóng gói",
    },
    {
      title: "Đơn Muộn",
      sub: "Quá 1 – 14 ngày",
      count: stats.overdueCount,
      color: "#f87171",
      glow: "rgba(248, 113, 113, 0.2)",
      hint: "Thúc đẩy tiến độ khẩn",
    },
    {
      title: "Trễ Nghiêm Trọng",
      sub: "Quá > 14 ngày",
      count: stats.criticalOverdueCount,
      color: "#ef4444",
      glow: "rgba(239, 68, 68, 0.25)",
      hint: "Báo cáo Ban giám đốc",
    },
    {
      title: "Kẹt Bước / Cần Xử Lý",
      sub: "Quá 7 ngày không cập nhật",
      count: stats.stalledCount,
      color: "#fb923c",
      glow: "rgba(251, 146, 60, 0.2)",
      hint: "Kiểm tra tổ sản xuất",
    },
  ];

  return (
    <div style={{ marginBottom: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <style>{`
        .sb-orders-toolbar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        @media (max-width: 640px) {
          .sb-orders-toolbar-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .sb-orders-view-switcher {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .sb-orders-view-segmented {
            width: 100% !important;
            display: flex !important;
          }
          .sb-orders-view-segmented button {
            flex: 1 !important;
            justify-content: center !important;
          }
          .sb-orders-financial-wrap {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
          }
        }
        @media (max-width: 400px) {
          .sb-orders-toolbar-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* 4 Executive KPI Stat Cards */}
      <div className="sb-orders-toolbar-grid">
        {alertCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "linear-gradient(180deg, rgba(17, 24, 39, 0.7) 0%, rgba(11, 15, 25, 0.8) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.15s ease",
            }}
          >
            {/* Top accent hairline */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "14px",
                right: "14px",
                height: "1.5px",
                background: `linear-gradient(90deg, transparent 0%, ${card.color} 50%, transparent 100%)`,
                opacity: 0.6,
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "999px",
                    background: card.color,
                    boxShadow: `0 0 6px ${card.glow}`,
                  }}
                />
                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em", color: "#94a3b8" }}>
                  {card.title}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#475569" }}>{card.sub}</span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: card.count > 0 ? card.color : "#f8fafc",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {card.count}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>đơn</span>
            </div>

            <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
              {card.hint}
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher & Action Toolbar (Linear Style) */}
      <div
        className="sb-orders-view-switcher"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "8px 12px",
          borderRadius: "10px",
          background: "rgba(11, 15, 25, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* View Mode Segmented Control */}
        <div
          className="sb-orders-view-segmented"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "6px",
              border: 0,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "table" ? "rgba(255, 255, 255, 0.1)" : "transparent",
              color: viewMode === "table" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
            <span>Bảng Số Cái</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "6px",
              border: 0,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "kanban" ? "rgba(255, 255, 255, 0.1)" : "transparent",
              color: viewMode === "kanban" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="16" rx="1" />
            </svg>
            <span>Luồng Kanban 6 Bước</span>
          </button>
        </div>

        {/* Financial KPI & Export Actions */}
        <div className="sb-orders-financial-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <span style={{ color: "#64748b" }}>Doanh số</span>
            <span style={{ color: "#38bdf8", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {fmtMoney(stats.totalRevenue)}
            </span>
            <span style={{ color: "#334155" }}>•</span>
            <span style={{ color: "#64748b" }}>Công nợ</span>
            <span style={{ color: "#fbbf24", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {fmtMoney(stats.totalOwed)}
            </span>
          </div>

          <OrdersExportButton />
        </div>
      </div>

      {/* Render Kanban View when selected */}
      {viewMode === "kanban" && <OrdersKanbanBoard />}
    </div>
  );
};

export default OrdersListToolbar;
