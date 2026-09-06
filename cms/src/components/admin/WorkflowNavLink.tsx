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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="15" y="3" width="6" height="6" rx="1" />
            <rect x="9" y="15" width="6" height="6" rx="1" />
            <path d="M6 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9M12 13v2" />
          </svg>
          <span>Quy Trình Sản Xuất (B1→B6)</span>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "4px",
            background: "rgba(56, 189, 248, 0.12)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            letterSpacing: "0.04em",
          }}
        >
          SLA
        </span>
      </Link>
    </div>
  );
}
