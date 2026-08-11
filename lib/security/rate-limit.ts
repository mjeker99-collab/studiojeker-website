type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Lightweight in-process rate limiter for single-node previews / small hosts.
 * Production should enforce limits at Cloudflare (or reverse proxy) — see SECURITY.md.
 */
const buckets = new Map<string, RateLimitEntry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(options.key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(options.key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Recommended contact-form window for app-level soft limiting. */
export const CONTACT_RATE_LIMIT = {
  limit: 8,
  windowMs: 15 * 60 * 1000,
} as const;
