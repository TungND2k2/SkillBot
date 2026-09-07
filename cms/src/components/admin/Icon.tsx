import React from "react";

/** Compact brand lockup used in the Payload navigation. */
export const Icon = () => (
  <div className="skillbot-nav-brand" aria-label="SkillBot ERP">
    <span className="skillbot-nav-brand__mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path d="M7 8.5 16 4l9 4.5v10L16 28l-9-4.5v-15Z" />
        <path d="m7 8.5 9 4.7 9-4.7M16 13.2V28" />
      </svg>
    </span>
    <span className="skillbot-nav-brand__name">SkillBot <b>ERP</b></span>
  </div>
);

export default Icon;
