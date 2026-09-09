import type { ReactNode } from "react";

/**
 * Shared benefit icons for Homepage Abo module + Content-Abo landing page.
 * Keys must stay aligned with Sanity `homepageBenefitItem` icon options.
 */
export const aboBenefitIcons: Record<string, ReactNode> = {
  continuous: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <rect x="12" y="10" width="24" height="28" stroke="currentColor" strokeWidth="1.75" />
      <path d="M18 8v4M30 8v4M16 20h16M16 26h10" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <path d="M12 28l12-6 12 6-12 6-12-6Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 20l12-6 12 6" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 14l12-6 12 6" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  visibility: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <path d="M12 30l7-9 6 5 6-10 5 6" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 12h28v24H10V12Z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  planning: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <rect x="10" y="16" width="28" height="18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 22h28M16 28h8" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
};
