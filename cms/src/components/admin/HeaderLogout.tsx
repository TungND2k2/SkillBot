"use client";

import React from "react";

/**
 * Nút Đăng xuất luôn nhìn thấy trên header (admin.components.actions).
 * Payload chỉ có logout ở cuối sidebar (phải cuộn) và trong trang tài khoản —
 * người dùng không tìm thấy.
 */
export const HeaderLogout = () => (
  <a className="skillbot-header-logout" href="/admin/logout" title="Đăng xuất khỏi hệ thống">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
    <span>Đăng xuất</span>
  </a>
);

export default HeaderLogout;
