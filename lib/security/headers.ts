/**
 * Shared HTTP security header values for Studiojeker.
 * Keep directives tight; whitelist external media hosts explicitly.
 */

const VIMEO_FRAME_SOURCES = ["https://player.vimeo.com", "https://vimeo.com"];
const VIMEO_IMG_SOURCES = ["https://i.vimeocdn.com"];
const SANITY_IMG_SOURCES = ["https://cdn.sanity.io"];
/** Reserved for future Turnstile / Cloudflare challenge widgets. */
const CLOUDFLARE_CHALLENGE_SOURCES = [
  "https://challenges.cloudflare.com",
];

export function buildContentSecurityPolicy(options?: {
  wordpressHostname?: string | null;
  enableTurnstile?: boolean;
}): string {
  const wordpressHost = options?.wordpressHostname?.trim();
  const imgSources = [
    "'self'",
    "data:",
    "blob:",
    ...VIMEO_IMG_SOURCES,
    ...SANITY_IMG_SOURCES,
  ];
  if (wordpressHost) {
    imgSources.push(`https://${wordpressHost}`);
  }

  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];
  const frameSources = ["'self'", ...VIMEO_FRAME_SOURCES];

  if (options?.enableTurnstile) {
    scriptSources.push(...CLOUDFLARE_CHALLENGE_SOURCES);
    connectSources.push(...CLOUDFLARE_CHALLENGE_SOURCES);
    frameSources.push(...CLOUDFLARE_CHALLENGE_SOURCES);
  }

  /**
   * Next.js App Router emits small inline scripts/styles.
   * Prefer migrating to nonce-based CSP later (see SECURITY.md).
   * Do not enable `unsafe-eval` or wildcard hosts.
   */
  const directives: string[] = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSources.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    `child-src ${frameSources.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Static security headers applied to every HTML/document response.
 * HSTS is intentionally omitted here — enable only on production HTTPS
 * at the edge (Cloudflare / Metanet). See SECURITY.md.
 */
export function getSecurityHeaders(options?: {
  wordpressHostname?: string | null;
  enableTurnstile?: boolean;
}): Array<{ key: string; value: string }> {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Permissions-Policy",
      value:
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
  ];
}

/** Documented allow-list for future CSP expansions (not injected by default). */
export const securityAllowlists = {
  vimeoFrames: VIMEO_FRAME_SOURCES,
  vimeoImages: VIMEO_IMG_SOURCES,
  sanityImages: SANITY_IMG_SOURCES,
  cloudflareChallenges: CLOUDFLARE_CHALLENGE_SOURCES,
} as const;
