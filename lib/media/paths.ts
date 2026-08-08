/** Encode public media paths that may contain spaces. */
export function mediaPath(src: string): string {
  return src
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");
}
