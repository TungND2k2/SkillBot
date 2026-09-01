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
        margin: "0 0 24px 0",
        padding: "24px",
        borderRadius: "14px",
        background: "linear-gradient(180deg, #0d1527 0%, #090d16 100%)",
        border: "1px solid #1e293b",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
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
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏭</span>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.01em" }}>
              Trung Tâm Điều Hành Sản Xuất SkillBot ERP
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              ● LIVE STATS
            </span>
          </div>
          <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: "4px 0 0 0" }}>
            Kiểm soát tiến độ TAT quy trình B1 → B6 · Cảnh báo tự động đa cấp độ
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/admin/collections/orders"
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
          >
            📋 Xem Sổ Cái Đơn Hàng ({stats.totalOrders})
          </Link>
          <Link
            href="/admin/quy-trinh"
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: "#161f30",
              border: "1px solid #1e293b",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🗂 Sơ Đồ B1 → B6
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
            padding: "14px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "4px solid #eab308",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              🟡 Sắp Đến Hạn
            </span>
            <span style={{ fontSize: "10.5px", color: "#eab308", fontWeight: 700 }}>≤ 7 ngày</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#facc15", marginTop: "4px", fontFamily: "monospace" }}>
            {stats.approachingCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0 0" }}>Cần đẩy nhanh KCS & đóng gói</p>
        </div>

        {/* 🔴 Đơn muộn */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "4px solid #f87171",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              🔴 Đơn Muộn
            </span>
            <span style={{ fontSize: "10.5px", color: "#f87171", fontWeight: 700 }}>Quá 1–14 ngày</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#f87171", marginTop: "4px", fontFamily: "monospace" }}>
            {stats.overdueCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0 0" }}>Thúc tiến độ khẩn & báo khách</p>
        </div>

        {/* 🔴 Trễ nghiêm trọng */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "4px solid #ef4444",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              🔴 Trễ Nghiêm Trọng
            </span>
            <span style={{ fontSize: "10.5px", color: "#ef4444", fontWeight: 700 }}>&gt; 14 ngày</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#ef4444", marginTop: "4px", fontFamily: "monospace" }}>
            {stats.criticalOverdueCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0 0" }}>Báo cáo giám đốc xử lý sự cố</p>
        </div>

        {/* 🟠 Cần xử lý */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderLeft: "4px solid #f97316",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              🟠 Cần Xử Lý (Kẹt)
            </span>
            <span style={{ fontSize: "10.5px", color: "#f97316", fontWeight: 700 }}>&gt; 7 ngày SLA</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#fb923c", marginTop: "4px", fontFamily: "monospace" }}>
            {stats.stalledCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Đơn</span>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0 0" }}>Không cập nhật quá thời hạn bước</p>
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
          padding: "12px 16px",
          borderRadius: "10px",
          background: "#090d16",
          border: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Đang trong luồng B1→B6: </span>
            <strong style={{ color: "#38bdf8", fontSize: "13px" }}>{stats.activePipeline} đơn</strong>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Tổng doanh thu đơn: </span>
            <strong style={{ color: "#10b981", fontSize: "13px", fontFamily: "monospace" }}>{fmtMoney(stats.totalRevenue)}</strong>
          </div>
        </div>

        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
          Quy định: Mỗi bước cần File/Ảnh hoặc Quản lý tích xác nhận để chuyển bước.
        </div>
      </div>
    </div>
  );
};

export default ErpDashboard;
