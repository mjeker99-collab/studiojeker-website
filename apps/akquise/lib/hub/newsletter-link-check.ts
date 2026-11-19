export type Result = { url: string; status: "reachable" | "broken" | "review"; detail: string };

// No generic URL fetching: a check button must not be an SSRF proxy.
export function approvedLinkUrl(raw: string): URL | null {
  try {
    const value = new URL(raw);
    if (value.protocol !== "https:" || value.username || value.password ||
        value.port || value.hostname.endsWith(".") || value.hostname.includes("%"))
      return null;
    const host = value.hostname.toLowerCase();
    const allowed =
      ["studiojeker.ch", "www.studiojeker.ch", "vimeo.com", "www.vimeo.com",
        "raw.githubusercontent.com", "mcusercontent.com"].includes(host) ||
      /^[a-z0-9-]+\.mcusercontent\.com$/.test(host);
    if (!allowed) return null;
    value.hash = "";
    return value;
  } catch { return null; }
}

export async function checkNewsletterLink(raw: string, fetcher: typeof fetch = fetch): Promise<Result> {
  const url = approvedLinkUrl(raw);
  if (!url) return { url: raw, status: "review", detail: "Nur manuell prüfen" };
  try {
    const response = await fetcher(url.toString(), {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (response.status >= 200 && response.status < 300)
      return { url: raw, status: "reachable", detail: "Server erreichbar" };
    if ([404, 410].includes(response.status))
      return { url: raw, status: "broken", detail: "Link nicht gefunden" };
    // Some sites reject HEAD or redirect to consent/tracking pages.
    return { url: raw, status: "review", detail: "Bitte im Browser öffnen" };
  } catch {
    return { url: raw, status: "review", detail: "Automatisch nicht prüfbar" };
  }
}

