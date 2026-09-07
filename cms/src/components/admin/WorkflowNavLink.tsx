"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function WorkflowNavLink() {
  const pathname = usePathname();
  const isActive = pathname === "/admin/quy-trinh";

  return (
    <div className="skillbot-nav-intro">
      <Link className="skillbot-nav-home" href="/admin" aria-label="Trang chủ SkillBot ERP">
        <span className="skillbot-nav-home__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path d="M7 8.5 16 4l9 4.5v10L16 28l-9-4.5v-15Z" />
            <path d="m7 8.5 9 4.7 9-4.7M16 13.2V28" />
          </svg>
        </span>
        <span className="skillbot-nav-home__copy">
          <strong>SkillBot <b>ERP</b></strong>
          <small>Điều hành sản xuất</small>
        </span>
      </Link>

      <Link className={`skillbot-workflow-link${isActive ? " is-active" : ""}`} href="/admin/quy-trinh">
        <span className="skillbot-workflow-link__label">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="15" y="3" width="6" height="6" rx="1" />
            <rect x="9" y="15" width="6" height="6" rx="1" />
            <path d="M6 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9M12 13v2" />
          </svg>
          <span>Quy trình sản xuất</span>
        </span>
        <span className="skillbot-workflow-link__badge">B1–B6</span>
      </Link>
    </div>
  );
}
