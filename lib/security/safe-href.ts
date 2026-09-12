/**
 * Validate and normalize href values from CMS or untrusted content.
 * Blocks javascript:, data:, vbscript:, and protocol-relative URLs.
 * Rewrites absolute Studiojeker hosts (www, apex, staging) to site-relative
 * paths so production HTML never embeds a staging origin in internal links.
 */

const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript):/i;

function isStudiojekerHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "studiojeker.ch" || host.endsWith(".studiojeker.ch");
}

/**
 * Absolute https://www.studiojeker.ch/... (and staging / apex) → /...
 * External https:// URLs stay absolute. Relative paths are unchanged.
 */
/** Empty string = blocked or invalid (callers fall back). */
export function sanitizeHref(href: string | null | undefined): string {
  const trimmed = (href ?? "").trim();
  if (!trimmed) return "";
  if (BLOCKED_PROTOCOLS.test(trimmed)) return "";
  if (trimmed.startsWith("//")) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "";
      }
      if (isStudiojekerHost(url.hostname)) {
        return `${url.pathname}${url.search}${url.hash}` || "/";
      }
      return trimmed;
    } catch {
      return "";
    }
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) {
    return trimmed;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return "";
  }

  return trimmed.startsWith("./") || trimmed.startsWith("../") ? trimmed : `/${trimmed}`;
}
