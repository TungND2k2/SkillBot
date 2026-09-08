import React from "react";

/**
 * Small brand mark used by Payload in the header / collapsed nav slot.
 * The slot is only ~20px and clips overflow, so this is a bare SVG that
 * scales to whatever box Payload gives it — background + mark drawn inside.
 * The full lockup (mark + name) lives in Logo.tsx (login screen).
 */
export const Icon = () => (
  <svg
    viewBox="0 0 32 32"
    role="img"
    aria-label="SkillBot ERP"
    style={{ display: "block", width: "100%", height: "100%" }}
  >
    <rect width="32" height="32" rx="8" fill="#175cd3" />
    <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 10.2 16 6.5l7.5 3.7v8.4L16 25.5l-7.5-3.9v-8.4Z" />
      <path d="m8.5 10.2 7.5 3.9 7.5-3.9M16 14.1v11.4" />
    </g>
  </svg>
);

export default Icon;
