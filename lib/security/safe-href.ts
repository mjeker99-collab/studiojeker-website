/**
 * Validate href values from CMS / editorial inputs before they reach the UI.
 * Unsafe schemes and protocol-relative URLs must never become `href` attributes.
 */

const ALLOWED_ABSOLUTE =
  /^(https:|mailto:|tel:)/i;

const BLOCKED_SCHEME =
  /^(javascript:|data:|vbscript:|file:)/i;

/**
 * Returns a trimmed safe href, or `null` when the value must not be rendered.
 *
 * Allowed:
 * - internal paths starting with `/` (not `//`)
 * - fragment-only anchors starting with `#`
 * - `https:`, `mailto:`, `tel:`
 *
 * Rejected:
 * - empty / whitespace-only
 * - `javascript:`, `data:`, `vbscript:`, `file:`
 * - protocol-relative URLs (`//…`)
 * - any other scheme or non-path relative value
 */
export function sanitizeHref(
  href: string | null | undefined,
): string | null {
  if (href == null) {
    return null;
  }

  const value = href.trim();
  if (!value) {
    return null;
  }

  // Protocol-relative URLs (e.g. //evil.example) — check before path allow.
  if (value.startsWith("//")) {
    return null;
  }

  if (BLOCKED_SCHEME.test(value)) {
    return null;
  }

  if (value.startsWith("/") || value.startsWith("#")) {
    return value;
  }

  if (ALLOWED_ABSOLUTE.test(value)) {
    return value;
  }

  return null;
}

/** True when `href` is safe to use as an anchor destination. */
export function isSafeHref(href: string | null | undefined): boolean {
  return sanitizeHref(href) !== null;
}
