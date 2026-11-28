import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type HostLookup = (host: string) => Promise<string[]>;

const INJECTION =
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions|system\s*:|you\s+are\s+now|disregard\s+(the|all)|<\s*\/?\s*im_start|do\s+not\s+follow\s+the\s+rules|new\s+instructions|tool_call|approve\s+sending|versand\s+freigeben/i;

export function injectionLine(line: string): boolean {
  return INJECTION.test(line);
}

export function htmlToText(html: string, limit = 150_000): string {
  const without = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?(?:address|article|br|dd|div|dl|dt|footer|h[1-6]|header|li|main|p|section|td|tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_entity, value: string) => {
      const code = value[0].toLowerCase() === "x" ? parseInt(value.slice(1), 16) : Number(value);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    })
    .replace(/&(auml|ouml|uuml|Auml|Ouml|Uuml|szlig);/g, (_entity, key: string) =>
      ({ auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß" })[key] ?? " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&quot;/gi, " ");
  return without.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, limit);
}

export function splitCleanLines(text: string): { clean: string[]; quarantined: string[] } {
  const clean: string[] = [];
  const quarantined: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (injectionLine(trimmed)) quarantined.push(trimmed);
    else clean.push(trimmed);
  }
  return { clean, quarantined };
}

function ipv4Private(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
    return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped) return ipv4Private(mapped[1]);
  if (normalized.includes(":")) {
    if (!/^[23][0-9a-f]{3}:/i.test(normalized)) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    if (normalized.startsWith("2001:db8")) return true;
    return false;
  }
  return ipv4Private(normalized);
}

export async function defaultLookup(host: string): Promise<string[]> {
  if (isIP(host)) return [host];
  const records = await lookup(host, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export async function assertPublicHttpsUrl(
  raw: string,
  lookupHost: HostLookup = defaultLookup,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Adresse ist keine URL.");
  }
  if (url.protocol !== "https:") throw new Error("Nur HTTPS ist zulässig.");
  if (url.username || url.password) throw new Error("URL mit Zugangsdaten ist blockiert.");
  if (url.port && url.port !== "443") throw new Error("Nur Port 443 ist zulässig.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    throw new Error("Interne Hostnamen sind blockiert.");
  }
  const addresses = await lookupHost(host);
  if (!addresses.length || addresses.some((address) => isPrivateAddress(address))) {
    throw new Error("Die Adresse zeigt auf ein nicht öffentliches Netz.");
  }
  return url;
}

export function robotsAllows(robotsTxt: string, path: string, agent = "studiojekerleadresearch"): boolean {
  const groups: { agents: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  for (const rawLine of robotsTxt.split(/\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const split = line.indexOf(":");
    if (split < 0) continue;
    const key = line.slice(0, split).trim().toLowerCase();
    const value = line.slice(split + 1).trim();
    if (key === "user-agent") {
      if (!current || current.disallow.length) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current) {
      current.disallow.push(value);
    }
  }
  const specific = groups.filter((group) => group.agents.includes(agent));
  const star = groups.filter((group) => group.agents.includes("*"));
  const chosen = specific.length ? specific : star;
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return !chosen.some((group) =>
    group.disallow.some((rule) => rule && (rule === "/" || pathname.startsWith(rule))),
  );
}
