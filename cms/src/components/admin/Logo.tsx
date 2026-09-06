import React from "react";

/** Full logo + enterprise factory tagline — hiển thị trên trang Login và Navbar. */
export const Logo = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
      width: "100%",
      maxWidth: "100%",
      textAlign: "center",
      boxSizing: "border-box",
    }}
  >
    {/* Glowing Logo Icon */}
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 14,
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 25px -4px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        position: "relative",
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
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    {/* Brand Title & Tagline */}
    <div style={{ maxWidth: "100%", padding: "0 8px", boxSizing: "border-box" }}>
      <div
        style={{
          fontSize: 21,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "#ffffff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span>SKILLBOT</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            letterSpacing: "0.04em",
          }}
        >
          ERP
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          marginTop: 6,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
          lineHeight: 1.4,
          maxWidth: "280px",
          margin: "6px auto 0",
        }}
      >
        Quản Trị Sản Xuất May Thêu Xuất Khẩu
      </div>
    </div>
  </div>
);

export default Logo;
