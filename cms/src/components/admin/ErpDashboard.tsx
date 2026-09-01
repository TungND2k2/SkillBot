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

  return (
    <div
      style={{
        margin: "0 0 28px 0",
        padding: "24px 28px",
        borderRadius: "16px",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(8, 13, 26, 0.8) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
          paddingBottom: "18px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
              Trung Tâm Điều Hành Sản Xuất SkillBot ERP
            </h2>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                letterSpacing: "0.05em",
              }}
            >
              ● LIVE
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
            Giám sát thời gian thực tiến độ TAT quy trình B1 → B6 · Cảnh báo tự động đa cấp độ
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/admin/collections/orders"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.4)",
              border: "1px solid #3b82f6",
            }}
          >
            📋 Xem Sổ Cái Đơn Hàng ({stats.totalOrders})
          </Link>
          <Link
            href="/admin/quy-trinh"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🗂 Sơ Đồ Luồng B1 → B6
          </Link>
        </div>
      </div>

      {/* 4 Alert Level Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {/* 🟡 Sắp đến hạn */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#080d1a",
            border: "1px solid rgba(234, 179, 8, 0.25)",
            borderLeft: "4px solid #eab308",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🟡 Sắp Đến Hạn
            </span>
            <span style={{ fontSize: "10px", color: "#eab308", fontWeight: 700, background: "rgba(234, 179, 8, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
              ≤ 7 ngày
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#facc15", marginTop: "6px", fontFamily: "monospace" }}>
            {stats.approachingCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Cần ưu tiên KCS & đóng gói</p>
        </div>

        {/* 🔴 Đơn muộn */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#080d1a",
            border: "1px solid rgba(248, 113, 113, 0.25)",
            borderLeft: "4px solid #f87171",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🔴 Đơn Muộn
            </span>
            <span style={{ fontSize: "10px", color: "#f87171", fontWeight: 700, background: "rgba(248, 113, 113, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
              1–14 ngày
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#f87171", marginTop: "6px", fontFamily: "monospace" }}>
            {stats.overdueCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Thúc tiến độ khẩn & báo khách</p>
        </div>

        {/* 🔴 Trễ nghiêm trọng */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#080d1a",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderLeft: "4px solid #ef4444",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🔴 Trễ Nghiêm Trọng
            </span>
            <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, background: "rgba(239, 68, 68, 0.2)", padding: "2px 6px", borderRadius: "4px" }}>
              &gt; 14 ngày
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#ef4444", marginTop: "6px", fontFamily: "monospace" }}>
            {stats.criticalOverdueCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Báo cáo ban giám đốc xử lý</p>
        </div>

        {/* 🟠 Cần xử lý */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#080d1a",
            border: "1px solid rgba(249, 115, 22, 0.25)",
            borderLeft: "4px solid #f97316",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🟠 Cần Xử Lý (Kẹt)
            </span>
            <span style={{ fontSize: "10px", color: "#f97316", fontWeight: 700, background: "rgba(249, 115, 22, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
              &gt; 7 ngày SLA
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fb923c", marginTop: "6px", fontFamily: "monospace" }}>
            {stats.stalledCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Không cập nhật quá hạn bước</p>
        </div>
      </div>

      {/* Production Overview Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 18px",
          borderRadius: "10px",
          background: "#050811",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div>
            <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>Đang trong luồng B1→B6: </span>
            <strong style={{ color: "#38bdf8", fontSize: "13px" }}>{stats.activePipeline} đơn</strong>
          </div>
          <div>
            <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>Tổng doanh thu: </span>
            <strong style={{ color: "#10b981", fontSize: "13px", fontFamily: "monospace" }}>{fmtMoney(stats.totalRevenue)}</strong>
          </div>
        </div>

        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
          ⚡ Mỗi bước cần File/Ảnh hoặc Quản lý tích xác nhận để chuyển bước.
        </div>
      </div>
    </div>
  );
};

export default ErpDashboard;
