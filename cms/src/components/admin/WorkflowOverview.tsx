/**
 * Custom admin view: /admin/quy-trinh
 *
 * Hiển thị quy trình B1 → B6 dạng flow đẹp + chi tiết từng bước.
 * Chỉ READ — không sửa được. Stages hard-code ở `lib/workflow-stages.ts`.
 */
import type { AdminViewServerProps } from "payload";
import {
  STAGES,
  type StageDef,
} from "../../lib/workflow-stages";

const ROLE_LABEL: Record<string, string> = {
  admin: "👑 Admin",
  manager: "📋 Manager",
  planner: "🔧 Planner",
  salesperson: "💼 Sales",
  qc: "✅ QC",
  storage: "📦 Storage",
  accountant: "💰 Kế toán",
  supplier: "🏭 NCC",
  recruiter: "🧑‍💼 Recruiter",
  trainer: "🎓 Trainer",
  visa_specialist: "🛂 Visa",
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
    <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Quy trình sản xuất
        </h1>
        <p
          style={{
            fontSize: 14,
            opacity: 0.65,
            marginTop: 6,
            lineHeight: 1.55,
          }}
        >
          Mỗi đơn đi qua 6 bước B1 → B6. Status đơn đổi tự động khi đã điền
          đủ trường bước hiện tại. Bot Telegram sẽ nhắc Sales/Manager khi 1
          đơn ở 1 bước quá hạn.
        </p>
      </div>

      {/* Horizontal flow */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 16,
          marginBottom: 32,
        }}
      >
        {STAGES.map((s, i) => (
          <div key={s.code} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                minWidth: 160,
                padding: 14,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                Bước {s.order}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 4,
                  letterSpacing: "0.02em",
                }}
              >
                {s.code.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.85,
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                ⏱ {dur(s)}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  fontSize: 24,
                  opacity: 0.35,
                  margin: "0 4px",
                }}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed stages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {STAGES.map((s) => (
          <div
            key={s.code}
            style={{
              padding: 20,
              borderRadius: 12,
              background: "rgb(var(--theme-elevation-50))",
              border: "1px solid rgb(var(--theme-elevation-100))",
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg, rgb(16,185,129) 0%, rgb(5,150,105) 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {s.order}
                </div>
                <div>
                  <div style={{ fontSize: 13, opacity: 0.5, fontWeight: 600 }}>
                    {s.code.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.name}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgb(var(--theme-elevation-100))",
                    fontWeight: 500,
                  }}
                >
                  ⏱ {dur(s)}
                </span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgb(var(--theme-elevation-100))",
                    fontWeight: 500,
                  }}
                >
                  Phụ trách: {ROLE_LABEL[s.responsibleRole] ?? s.responsibleRole}
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.7,
                opacity: 0.85,
                whiteSpace: "pre-line",
              }}
            >
              {s.description}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px dashed rgb(var(--theme-elevation-150))",
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              🔔 Nhắc qua Telegram:{" "}
              {s.reminderRoles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 32,
          padding: 16,
          borderRadius: 10,
          background: "rgb(var(--theme-elevation-50))",
          fontSize: 12,
          opacity: 0.7,
          lineHeight: 1.7,
        }}
      >
        💡 Quy trình hard-code trong{" "}
        <code
          style={{
            background: "rgb(var(--theme-elevation-100))",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          cms/src/lib/workflow-stages.ts
        </code>
        . Cần thêm bước hoặc đổi durationDays → sửa file đó + deploy. Không
        chỉnh được qua admin (theo design) để tránh manager break flow.
      </div>
    </div>
  );
}
