import React from "react";

/** Full logo + enterprise factory tagline — hiển thị trên trang Login và Navbar. */
export const Logo = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 16,
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 12px 30px rgba(37, 99, 235, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
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
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
        }}
      >
        SKILLBOT <span style={{ color: "#38bdf8", fontWeight: 700 }}>ERP</span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          marginTop: 4,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Hệ Thống Quản Trị Sản Xuất May Thêu Xuất Khẩu
      </div>
    </div>
  </div>
);

export default Logo;
