/**
 * Studiojeker marketing site CMS — fixed to the existing Sanity project.
 * Tokens are server-only; never expose write credentials to the browser.
 */
export const siteCmsProject = "tgx6e6jg";
export const siteCmsDataset = "production";
export const siteCmsApiVersion = "2025-02-19";
export const siteCmsStudioUrl = "https://studiojeker.sanity.studio/structure";
export const siteCmsLiveUrl = "https://www.studiojeker.ch";
export const siteCmsStagingUrl = "https://staging2026.studiojeker.ch";

export function getSanityReadToken(): string | undefined {
  return process.env.SANITY_API_READ_TOKEN?.trim() || undefined;
}

/** Editor/write token — server only. Required for draft save, media upload, publish. */
export function getSanityWriteToken(): string | undefined {
  return process.env.SANITY_API_WRITE_TOKEN?.trim() || undefined;
}

/**
 * Explicit gate for publishing Sanity drafts to the production dataset.
 * Default off so StudioONE never publishes studiojeker.ch without ops approval.
 */
export function siteCmsPublishAllowed(): boolean {
  return process.env.SITE_CMS_ALLOW_PUBLISH?.trim() === "true";
}
