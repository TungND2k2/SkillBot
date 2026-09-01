/**
 * Custom admin view: /admin/quy-trinh
 * Sơ đồ Quy Trình Sản Xuất B1 → B6 chuẩn Enterprise ERP
 */
import type { AdminViewServerProps } from "payload";
import { STAGES, type StageDef } from "../../lib/workflow-stages";

const ROLE_LABEL: Record<string, string> = {
  admin: "👑 Admin Quản trị",
  manager: "📋 Quản lý Sản xuất",
  planner: "🔧 Kế hoạch Kỹ thuật",
  salesperson: "💼 Kinh doanh / Sales",
  qc: "✅ Kiểm định KCS (QC)",
  storage: "📦 Quản lý Kho NPL",
  accountant: "💰 Kế toán Tài chính",
  supplier: "🏭 Nhà cung cấp / Xưởng gia công",
  recruiter: "🧑‍💼 Tuyển dụng",
  trainer: "🎓 Đào tạo",
  visa_specialist: "🛂 Visa xuất khẩu",
  medical: "🏥 Y tế",
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
          borderBottom: "1px solid rgb(var(--theme-elevation-150))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(37, 99, 235, 0.15)",
              color: "#3b82f6",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              border: "1px solid rgba(59, 130, 246, 0.3)",
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
            }}
          >
            Sơ Đồ Quy Trình Sản Xuất May Thêu (B1 → B6)
          </h1>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "rgb(var(--theme-elevation-400))",
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
                background: "rgb(var(--theme-elevation-50))",
                border: "1px solid rgb(var(--theme-elevation-150))",
                borderTop: "4px solid #2563eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgb(var(--theme-elevation-400))",
                      textTransform: "uppercase",
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
                      background: "rgba(37, 99, 235, 0.12)",
                      color: "#3b82f6",
                    }}
                  >
                    {s.code.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "rgb(var(--theme-elevation-900))",
                    lineHeight: 1.35,
                  }}
                >
                  {s.name}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgb(var(--theme-elevation-400))",
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: "1px solid rgb(var(--theme-elevation-150))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>⏱ {dur(s)}</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>Hoạt động</span>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  fontSize: 20,
                  color: "rgb(var(--theme-elevation-300))",
                  margin: "0 6px",
                  fontWeight: 700,
                }}
              >
                →
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
              background: "rgb(var(--theme-elevation-50))",
              border: "1px solid rgb(var(--theme-elevation-150))",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  }}
                >
                  {s.order}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgb(var(--theme-elevation-400))", fontWeight: 700, textTransform: "uppercase" }}>
                    MÃ CÔNG ĐOẠN: {s.code.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "rgb(var(--theme-elevation-900))",
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
                    background: "rgb(var(--theme-elevation-100))",
                    border: "1px solid rgb(var(--theme-elevation-150))",
                    fontWeight: 600,
                    color: "rgb(var(--theme-elevation-800))",
                  }}
                >
                  ⏱ Định mức thời gian: {dur(s)}
                </span>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "rgba(37, 99, 235, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    fontWeight: 600,
                    color: "#3b82f6",
                  }}
                >
                  👤 Phụ trách: {ROLE_LABEL[s.responsibleRole] ?? s.responsibleRole}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.7,
                color: "rgb(var(--theme-elevation-800))",
                whiteSpace: "pre-line",
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgb(var(--theme-elevation-0))",
                border: "1px solid rgb(var(--theme-elevation-100))",
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
                color: "rgb(var(--theme-elevation-400))",
              }}
            >
              <span>🔔 Nhắc việc tự động qua Telegram:</span>
              <strong style={{ color: "#f59e0b" }}>
                {s.reminderRoles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
