"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkflowNavLink() {
  const pathname = usePathname();
  const isActive = pathname === "/admin/quy-trinh";

  return (
    <div style={{ padding: "4px 8px 10px 8px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "12px" }}>
      <Link
        href="/admin/quy-trinh"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 700,
          background: isActive
            ? "linear-gradient(90deg, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0.05) 100%)"
            : "rgba(255, 255, 255, 0.03)",
          color: isActive ? "#38bdf8" : "#cbd5e1",
          border: `1px solid ${isActive ? "rgba(56, 189, 248, 0.35)" : "rgba(255, 255, 255, 0.06)"}`,
          textDecoration: "none",
          transition: "all 0.15s ease",
          boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.15)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "14px" }}>🗂</span>
          <span>Sơ Đồ Quy Trình B1→B6</span>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "4px",
            background: "rgba(37, 99, 235, 0.2)",
            color: "#60a5fa",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          SLA
        </span>
      </Link>
    </div>
  );
}
