"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Reminder {
  atDay: number;
  kind: "checkin" | "overdue" | "critical";
  recipients?: string[];
}

interface Stage {
  id: string;
  order: number;
  code: string;
  name: string;
  durationDays?: number;
  minDurationDays?: number;
  maxDurationDays?: number;
  responsibleRole: string;
  isActive?: boolean;
  reminders?: Reminder[];
  description?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "👑 Admin",
  manager: "📋 Manager",
  planner: "🔧 Planner",
  salesperson: "💼 Sales",
  qc: "✅ QC",
  storage: "📦 Storage",
  accountant: "💰 Kế toán",
  supplier: "🏭 NCC",
};

const KIND_DOT: Record<string, string> = {
  checkin: "#3b82f6",
  overdue: "#f59e0b",
  critical: "#ef4444",
};

function durationLabel(s: Stage): string {
  if (s.minDurationDays && s.maxDurationDays) {
    return `${s.minDurationDays}–${s.maxDurationDays} ngày`;
  }
  if (s.durationDays) return `${s.durationDays} ngày`;
  return "—";
}

export const WorkflowDiagram: React.FC = () => {
  const { id } = useDocumentInfo();
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setStages([]);
      return;
    }
    const url =
      `/api/workflow-stages` +
      `?where[workflow][equals]=${encodeURIComponent(String(id))}` +
      `&sort=order&limit=100&depth=0`;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { docs: Stage[] }) => setStages(d.docs ?? []))
      .catch((e) => setError(`Không tải được các bước (${e})`));
  }, [id]);

  if (!id) {
    return (
      <Hint>
        Lưu quy trình trước để bắt đầu cấu hình các bước. Sau khi lưu, bạn có thể
        thêm các bước (B1, B2, ...) ở bên dưới hoặc trong collection
        <em> Bước quy trình</em>.
      </Hint>
    );
  }

  if (error) return <Hint variant="error">{error}</Hint>;
  if (stages === null) return <Hint>Đang tải sơ đồ quy trình...</Hint>;

  if (stages.length === 0) {
    return (
      <Hint variant="empty">
        Quy trình này chưa có bước nào.{" "}
        <Link
          href={`/admin/collections/workflow-stages/create?workflow=${id}`}
          style={{ textDecoration: "underline", fontWeight: 600, color: "#3b82f6" }}
        >
          + Tạo bước đầu tiên
        </Link>
      </Hint>
    );
  }

  return (
    <div style={{ marginTop: 8, marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Sơ đồ quy trình ({stages.length} bước)
        </div>
        <Link
          href={`/admin/collections/workflow-stages/create?workflow=${id}`}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            border: "1px solid rgb(var(--theme-elevation-200))",
            borderRadius: 6,
            textDecoration: "none",
            background: "rgb(var(--theme-elevation-50))",
            fontWeight: 600,
            color: "#3b82f6",
          }}
        >
          + Thêm bước
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 12,
          paddingTop: 4,
        }}
      >
        {stages.map((s, idx) => (
          <div
            key={s.id}
            style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}
          >
            <StageCard stage={s} />
            {idx < stages.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  );
};

const StageCard: React.FC<{ stage: Stage }> = ({ stage }) => {
  const roleLabel = ROLE_LABEL[stage.responsibleRole] ?? stage.responsibleRole;
  const reminderCount = stage.reminders?.length ?? 0;
  const dimmed = stage.isActive === false;

  return (
    <Link
      href={`/admin/collections/workflow-stages/${stage.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        minWidth: 200,
        maxWidth: 220,
        padding: 12,
        border: "1px solid rgb(var(--theme-elevation-150))",
        borderRadius: 10,
        background: "rgb(var(--theme-elevation-50))",
        opacity: dimmed ? 0.5 : 1,
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {stage.order}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#3b82f6",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {stage.code}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
        {stage.name}
      </div>
      <div style={{ fontSize: 11, color: "rgb(var(--theme-elevation-400))", lineHeight: 1.6 }}>
        <div>⏱ {durationLabel(stage)}</div>
        <div>{roleLabel}</div>
        {reminderCount > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 3, alignItems: "center" }}>
            {stage.reminders?.map((r, i) => (
              <span
                key={i}
                title={`Ngày ${r.atDay} — ${r.kind}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: KIND_DOT[r.kind] ?? "#94a3b8",
                  display: "inline-block",
                }}
              />
            ))}
            <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 600 }}>
              {reminderCount} nhắc
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

const Arrow: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      color: "rgb(var(--theme-elevation-300))",
      flexShrink: 0,
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const Hint: React.FC<{
  children: React.ReactNode;
  variant?: "error" | "empty" | "default";
}> = ({ children, variant = "default" }) => {
  const palette: Record<string, { bg: string; border: string; color?: string }> = {
    default: { bg: "rgb(var(--theme-elevation-50))", border: "rgb(var(--theme-elevation-150))" },
    empty: { bg: "rgb(var(--theme-elevation-50))", border: "rgb(var(--theme-elevation-200))" },
    error: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", color: "#ef4444" },
  };
  const p = palette[variant];
  return (
    <div
      style={{
        padding: 14,
        border: `1px dashed ${p.border}`,
        borderRadius: 8,
        background: p.bg,
        color: p.color,
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
};

export default WorkflowDiagram;
