import React from "react";

/** Brand icon — hiển thị ở góc trên bên trái thanh menu Payload. */
export const Icon = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 16px rgba(59, 130, 246, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <span
      style={{
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      SKILLBOT <span style={{ color: "#38bdf8", fontWeight: 700 }}>ERP</span>
    </span>
  </div>
);

export default Icon;
