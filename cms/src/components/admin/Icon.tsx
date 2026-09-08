import React from "react";

/**
 * Small brand mark used by Payload in the header / collapsed nav slot.
 * Mark only — the slot is ~32px wide, any text next to it gets clipped.
 * The full lockup (mark + name) lives in Logo.tsx (login screen).
 */
export const Icon = () => (
  <span className="skillbot-nav-brand__mark" aria-label="SkillBot ERP" role="img">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 8.5 16 4l9 4.5v10L16 28l-9-4.5v-15Z" />
      <path d="m7 8.5 9 4.7 9-4.7M16 13.2V28" />
    </svg>
  </span>
);

export default Icon;
