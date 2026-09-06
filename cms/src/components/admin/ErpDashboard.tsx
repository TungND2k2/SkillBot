"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getOrderAlertStatus } from "../../lib/workflow-stages";

interface StatsData {
  totalOrders: number;
  activePipeline: number;
  approachingCount: number;
  overdueCount: number;
  criticalOverdueCount: number;
  stalledCount: number;
  totalRevenue: number;
}

export const ErpDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalOrders: 0,
    activePipeline: 0,
    approachingCount: 0,
    overdueCount: 0,
    criticalOverdueCount: 0,
    stalledCount: 0,
    totalRevenue: 0,
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
        let active = 0;
        let approaching = 0;
        let overdue = 0;
        let critical = 0;
        let stalled = 0;

        for (const o of docs) {
          revenue += o.totalAmount || 0;
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

  const alertCards = [
    {
      title: "Sắp Đến Hạn",
      sub: "≤ 7 ngày trả",
      count: stats.approachingCount,
      color: "#eab308",
      glow: "rgba(234, 179, 8, 0.2)",
      hint: "Ưu tiên KCS & Đóng gói",
    },
    {
      title: "Đơn Muộn",
      sub: "1 – 14 ngày",
      count: stats.overdueCount,
      color: "#f87171",
      glow: "rgba(248, 113, 113, 0.2)",
      hint: "Thúc tiến độ khẩn cấp",
    },
    {
      title: "Trễ Nghiêm Trọng",
      sub: "> 14 ngày",
      count: stats.criticalOverdueCount,
      color: "#ef4444",
      glow: "rgba(239, 68, 68, 0.25)",
      hint: "Báo cáo Ban giám đốc",
    },
    {
      title: "Cần Xử Lý / Kẹt",
      sub: "> 7 ngày SLA",
      count: stats.stalledCount,
      color: "#fb923c",
      glow: "rgba(251, 146, 60, 0.2)",
      hint: "Kiểm tra tổ sản xuất",
    },
  ];

  return (
    <div
      style={{
        margin: "0 0 24px 0",
        padding: "20px 24px",
        borderRadius: "12px",
        background: "linear-gradient(180deg, rgba(17, 24, 39, 0.6) 0%, rgba(9, 13, 22, 0.8) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
          paddingBottom: "14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
              Trung Tâm Điều Hành Sản Xuất SkillBot ERP
            </h2>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                letterSpacing: "0.04em",
              }}
            >
              ● LIVE
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0 0" }}>
            Giám sát thời gian thực tiến độ TAT quy trình B1 → B6 · Cảnh báo tự động đa cấp độ
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href="/admin/collections/orders"
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
            <span>Sổ Cái Đơn Hàng ({stats.totalOrders})</span>
          </Link>
          <Link
            href="/admin/quy-trinh"
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="6" height="6" rx="1" />
              <rect x="15" y="3" width="6" height="6" rx="1" />
              <rect x="9" y="15" width="6" height="6" rx="1" />
              <path d="M6 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9M12 13v2" />
            </svg>
            <span>Sơ Đồ Luồng B1 → B6</span>
          </Link>
        </div>
      </div>

      {/* 4 Executive Alert Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {alertCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(11, 15, 25, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              position: "relative",
              overflow: "hidden",
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
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
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>
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

            <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>
              {card.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Production Overview Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>Đang trong luồng B1→B6: </span>
            <strong style={{ color: "#38bdf8", fontSize: "12.5px", fontVariantNumeric: "tabular-nums" }}>
              {stats.activePipeline} đơn
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>Tổng doanh thu: </span>
            <strong style={{ color: "#10b981", fontSize: "12.5px", fontVariantNumeric: "tabular-nums" }}>
              {fmtMoney(stats.totalRevenue)}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: "11.5px", color: "#475569" }}>
          Mỗi bước cần nghiệm thu File/Ảnh hoặc Quản lý xác nhận để chuyển tiếp SLA.
        </div>
      </div>
    </div>
  );
};

export default ErpDashboard;
