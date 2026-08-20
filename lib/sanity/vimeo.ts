/** Extract a numeric Vimeo video ID from a URL or raw ID string. */
export function extractVimeoId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /vimeo\.com\/(?:video\/)?(\d+)/i,
    /player\.vimeo\.com\/video\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}
