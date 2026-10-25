/**
 * Non-secret deploy identity from Render (or empty locally).
 * Safe to expose on health endpoints for ops verification.
 */
export function deployIdentity(
  env: Record<string, string | undefined> = process.env,
) {
  const commit = (env.RENDER_GIT_COMMIT || env.GIT_COMMIT || "").trim();
  const branch = (env.RENDER_GIT_BRANCH || env.GIT_BRANCH || "").trim();
  return {
    service:
      (env.RENDER_SERVICE_NAME || env.RENDER_SERVICE_ID || "").trim() || null,
    branch: branch || null,
    commit: commit ? commit.slice(0, 12) : null,
  };
}
