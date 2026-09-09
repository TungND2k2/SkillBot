import React from "react";

/** Brand lockup used by Payload on authentication screens (above the login card). */
export const Logo = () => (
  <div className="skillbot-login-brand" aria-label="SkillBot ERP">
    <div className="skillbot-login-brand__mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path d="M7 8.5 16 4l9 4.5v10L16 28l-9-4.5v-15Z" />
        <path d="m7 8.5 9 4.7 9-4.7M16 13.2V28M10.8 18.4l2.8 1.5 7.6-4" />
      </svg>
    </div>
    <div className="skillbot-login-brand__copy">
      <div className="skillbot-login-brand__name">
        SkillBot <span>ERP</span>
      </div>
      <p>Hệ thống điều hành sản xuất may thêu xuất khẩu</p>
    </div>
  </div>
);

export default Logo;
