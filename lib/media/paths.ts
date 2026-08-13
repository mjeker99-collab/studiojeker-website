/** Encode public media paths that may contain spaces. */
export function mediaPath(src: string): string {
  // Absolute URLs (e.g. Sanity CDN images) are already valid — never re-encode
  // them, otherwise the scheme/host separators would be corrupted.
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return src
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");
}
