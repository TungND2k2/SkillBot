/**
 * Nav link "Quy trình" cho admin sidebar — wire qua admin.components.beforeNavLinks.
 */
import Link from "next/link";

export default function WorkflowNavLink() {
  return (
    <Link
      href="/admin/quy-trinh"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 12px",
        margin: "0 6px 4px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        color: "inherit",
        textDecoration: "none",
        transition: "background-color 0.15s ease",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h6M4 12h6M4 18h6M14 6h6M14 12h6M14 18h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10 6c2 0 2 6 4 6s2-6 4-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Quy trình</span>
    </Link>
  );
}
