import React from "react";

/** Full logo + enterprise factory tagline — hiển thị trên trang Login và Navbar. */
export const Logo = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    }}
  >
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 14,
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 21h18M3 7v14M21 7v14M6 11h3M15 11h3M6 15h3M15 15h3M3 7l9-4 9 4"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 21,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "rgb(var(--theme-elevation-900))",
        }}
      >
        SKILLBOT <span style={{ color: "#3b82f6", fontWeight: 600 }}>ERP</span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgb(var(--theme-elevation-400))",
          marginTop: 2,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Hệ Thống Quản Trị Sản Xuất May Thêu
      </div>
    </div>
  </div>
);

export default Logo;
