import React from "react";
import Link from "next/link";

export const ErpDashboard: React.FC = () => {
  return (
    <div
      style={{
        marginBottom: "28px",
        borderRadius: "14px",
        border: "1px solid rgb(var(--theme-elevation-150))",
        background: "rgb(var(--theme-elevation-50))",
        padding: "24px",
        boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "20px",
          borderBottom: "1px solid rgb(var(--theme-elevation-150))",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "18px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            🏭
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Trung Tâm Điều Hành Sản Xuất ERP
              </h2>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                  }}
                />
                Hệ thống hoạt động
              </span>
            </div>
            <p
              style={{
                fontSize: "12.5px",
                color: "rgb(var(--theme-elevation-400))",
                margin: "4px 0 0 0",
              }}
            >
              Kiểm soát tiến độ 6 bước, định mức vật tư BOM, tồn kho NPL và KCS chất lượng
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/admin/quy-trinh"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(37, 99, 235, 0.12)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            📊 Sơ đồ quy trình B1→B6
          </Link>
          <Link
            href="/admin/collections/orders/create"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
          >
            ➕ Tạo Đơn Hàng Mới
          </Link>
        </div>
      </div>

      {/* 4 KPI Quick Metric Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgb(var(--theme-elevation-100))",
            border: "1px solid rgb(var(--theme-elevation-150))",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "rgb(var(--theme-elevation-400))", textTransform: "uppercase" }}>
            Đơn Hàng Trong Luồng
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", fontFamily: "monospace" }}>
            B1 → B6 Active
          </div>
          <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "4px" }}>
            Tự động đẩy bước qua hook
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgb(var(--theme-elevation-100))",
            border: "1px solid rgb(var(--theme-elevation-150))",
            borderLeft: "4px solid #10b981",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "rgb(var(--theme-elevation-400))", textTransform: "uppercase" }}>
            Định Mức BOM Kỹ Thuật
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", fontFamily: "monospace" }}>
            Định Mức & Hao Phí
          </div>
          <div style={{ fontSize: "11px", color: "#10b981", marginTop: "4px" }}>
            Kiểm soát tỷ lệ định mức vải
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgb(var(--theme-elevation-100))",
            border: "1px solid rgb(var(--theme-elevation-150))",
            borderLeft: "4px solid #f59e0b",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "rgb(var(--theme-elevation-400))", textTransform: "uppercase" }}>
            Tồn Kho Nguyên Phụ Liệu
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", fontFamily: "monospace" }}>
            Safety Stock Alert
          </div>
          <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
            Cảnh báo mức an toàn kho
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgb(var(--theme-elevation-100))",
            border: "1px solid rgb(var(--theme-elevation-150))",
            borderLeft: "4px solid #8b5cf6",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "rgb(var(--theme-elevation-400))", textTransform: "uppercase" }}>
            Kiểm Định Chất Lượng KCS
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", fontFamily: "monospace" }}>
            Biên Bản QC Logs
          </div>
          <div style={{ fontSize: "11px", color: "#8b5cf6", marginTop: "4px" }}>
            Theo dõi tỷ lệ đạt & khuyết tật
          </div>
        </div>
      </div>

      {/* Pipeline Stages Quick Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          paddingTop: "14px",
          borderTop: "1px dashed rgb(var(--theme-elevation-150))",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: "rgb(var(--theme-elevation-400))", textTransform: "uppercase" }}>
          Lối tắt phân hệ:
        </span>
        {[
          { label: "📦 Sổ cái Đơn hàng", href: "/admin/collections/orders" },
          { label: "🧵 Danh mục Mã Vải", href: "/admin/collections/fabrics" },
          { label: "🏭 Nhà cung cấp & Xưởng", href: "/admin/collections/suppliers" },
          { label: "📊 Tồn kho NPL", href: "/admin/collections/inventory" },
          { label: "📐 Định mức BOM", href: "/admin/collections/allowances" },
          { label: "🔍 Biên bản KCS QC", href: "/admin/collections/qc-logs" },
          { label: "🤖 Bot Cảnh Báo", href: "/admin/collections/reminders" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontSize: "11.5px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgb(var(--theme-elevation-100))",
              color: "rgb(var(--theme-elevation-800))",
              border: "1px solid rgb(var(--theme-elevation-150))",
              textDecoration: "none",
              fontWeight: 500,
              transition: "all 0.1s ease",
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ErpDashboard;
