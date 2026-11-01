import { PolicyError } from "../policy";

export const linkedinOrganizationPattern =
  /^urn:li:organization:([0-9]{1,30})$/;
export const linkedinScope =
  "openid profile r_organization_admin w_organization_social";
export type LinkedInOrganization = {
  accountId: string;
  accountName: string;
  url: string;
};
type Read = (path: string) => Promise<unknown>;
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

// Only the authenticated member's APPROVED organic-content roles are eligible.
// The provider's pagination URLs are never fetched (tokens must stay on LinkedIn).
export async function studiojekerOrganizations(
  read: Read,
): Promise<LinkedInOrganization[]> {
  const ids = new Set<string>();
  const count = 100;
  for (let page = 0; page < 20; page++) {
    const response = record(
      await read(
        `/organizationAcls?q=roleAssignee&state=APPROVED&count=${count}&start=${page * count}`,
      ),
    );
    if (!Array.isArray(response.elements))
      throw new PolicyError(
        "LinkedIn hat keine gültige Seitenliste geliefert.",
        502,
      );
    for (const raw of response.elements) {
      const acl = record(raw);
      if (
        acl.state !== "APPROVED" ||
        !["ADMINISTRATOR", "CONTENT_ADMINISTRATOR"].includes(String(acl.role))
      )
        continue;
      const match = linkedinOrganizationPattern.exec(
        String(acl.organizationTarget || acl.organization || ""),
      );
      if (match) ids.add(match[1]);
    }
    const paging = record(response.paging);
    const hasNext =
      Array.isArray(paging.links) &&
      paging.links.some((link) => record(link).rel === "next");
    const hasMore =
      typeof paging.total === "number" && paging.total > (page + 1) * count;
    if (!hasNext && !hasMore && response.elements.length < count) break;
    if (page === 19)
      throw new PolicyError(
        "Die LinkedIn-Seitenliste ist zu gross. Bitte den Support kontaktieren.",
        502,
      );
  }
  const candidates: LinkedInOrganization[] = [];
  const allIds = [...ids];
  for (let offset = 0; offset < allIds.length; offset += 20) {
    const batch = allIds.slice(offset, offset + 20);
    const response = record(
      await read(`/organizationsLookup?ids=List(${batch.join(",")})`),
    );
    const results = record(response.results);
    for (const id of batch) {
      const org = record(results[id]);
      // Exact official page identity, never a similarly named third-party page.
      if (String(org.id) !== id || org.vanityName !== "studiojeker") continue;
      candidates.push({
        accountId: `urn:li:organization:${id}`,
        accountName:
          typeof org.localizedName === "string" && org.localizedName.trim()
            ? org.localizedName.slice(0, 200)
            : "Studiojeker",
        url: "https://www.linkedin.com/company/studiojeker/",
      });
    }
  }
  return candidates;
}

export async function readLinkedIn(
  path: string,
  token: string,
  fetcher: typeof fetch = fetch,
) {
  const version = process.env.LINKEDIN_API_VERSION || "202610";
  if (!/^20\d{2}(0[1-9]|1[0-2])$/.test(version))
    throw new PolicyError("Die LinkedIn-API-Version ist ungültig.", 503);
  if (
    !path.startsWith("/organizationAcls?") &&
    !path.startsWith("/organizationsLookup?")
  )
    throw new PolicyError("Ungültige LinkedIn-Anfrage.");
  let response: Response;
  try {
    response = await fetcher(`https://api.linkedin.com/rest${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": version,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new PolicyError(
      "LinkedIn ist gerade nicht erreichbar. Bitte später erneut versuchen.",
      502,
    );
  }
  if (response.status === 401)
    throw new PolicyError(
      "Die LinkedIn-Freigabe ist abgelaufen oder widerrufen. Bitte LinkedIn erneut verbinden.",
      401,
    );
  if (response.status === 403)
    throw new PolicyError(
      "LinkedIn erlaubt den Seitenzugriff noch nicht. Community-Management-Zugriff und r_organization_admin freischalten, dann LinkedIn erneut verbinden.",
      403,
    );
  if (response.status === 429)
    throw new PolicyError(
      "LinkedIn hat zu viele Anfragen erhalten. Bitte später erneut versuchen.",
      429,
    );
  if (!response.ok)
    throw new PolicyError(
      "LinkedIn konnte die Unternehmensseite nicht prüfen. Bitte die App-Konfiguration prüfen.",
      502,
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new PolicyError("LinkedIn hat keine gültige Antwort geliefert.", 502);
  }
}
