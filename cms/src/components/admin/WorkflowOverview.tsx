/**
 * Custom admin view: /admin/quy-trinh
 * Sơ đồ Quy Trình Sản Xuất B1 → B6 chuẩn Enterprise ERP
 */
import type { AdminViewServerProps } from "payload";
import { STAGES, type StageDef } from "../../lib/workflow-stages";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin Quản trị",
  manager: "Quản lý Sản xuất",
  planner: "Kế hoạch Kỹ thuật",
  salesperson: "Kinh doanh (Sales)",
  qc: "Kiểm định KCS (QC)",
  storage: "Quản lý Kho NPL",
  accountant: "Kế toán Tài chính",
  supplier: "Nhà cung cấp / Xưởng gia công",
  recruiter: "Tuyển dụng",
  trainer: "Đào tạo",
  visa_specialist: "Visa xuất khẩu",
  medical: "Y tế",
};

function dur(s: StageDef): string {
  if (s.minDurationDays && s.maxDurationDays) {
    return `${s.minDurationDays}–${s.maxDurationDays} ngày`;
  }
  return `${s.durationDays} ngày`;
}

export default async function WorkflowOverview(_props: AdminViewServerProps) {
  return (
    <div style={{ padding: "32px 24px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Header bar */}
      <div
        style={{
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(56, 189, 248, 0.1)",
              color: "#38bdf8",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            Quy trình chuẩn hóa
          </span>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#f8fafc",
            }}
          >
            Sơ Đồ Quy Trình Sản Xuất May Thêu (B1 → B6)
          </h1>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Mỗi đơn hàng tự động luân chuyển qua 6 giai đoạn khép kín. Hệ thống tự động kích hoạt bot Telegram cảnh báo khi đơn hàng bị trễ hạn hoặc thiếu dữ liệu nghiệm thu.
        </p>
      </div>

      {/* Horizontal visual pipeline flow */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
          marginBottom: 32,
        }}
      >
        {STAGES.map((s, i) => (
          <div key={s.code} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                minWidth: 180,
                padding: "16px 14px",
                borderRadius: 12,
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Bước {s.order}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                    }}
                  >
                    {s.code.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#f8fafc",
                    lineHeight: 1.35,
                  }}
                >
                  {s.name}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  marginTop: 14,
                  paddingTop: 8,
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Thời hạn: {dur(s)}</span>
                <span style={{ color: "#34d399", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
                  Hoạt động
                </span>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.2)",
                  margin: "0 6px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed stage cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {STAGES.map((s) => (
          <div
            key={s.code}
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    fontFamily: "monospace",
                  }}
                >
                  {s.order}
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    MÃ CÔNG ĐOẠN: {s.code.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "#f8fafc",
                    }}
                  >
                    {s.name}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, fontSize: 12, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontWeight: 600,
                    color: "#cbd5e1",
                  }}
                >
                  Định mức: {dur(s)}
                </span>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "rgba(56, 189, 248, 0.08)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    fontWeight: 600,
                    color: "#38bdf8",
                  }}
                >
                  Phụ trách: {ROLE_LABEL[s.responsibleRole] ?? s.responsibleRole}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "#cbd5e1",
                whiteSpace: "pre-line",
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {s.description}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Nhắc việc tự động qua Telegram:
              </span>
              <strong style={{ color: "#fbbf24", fontWeight: 600 }}>
                {s.reminderRoles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
