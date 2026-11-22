export type MasterlistAccess =
  | "ready"
  | "consent_required"
  | "unreachable"
  | "missing";

export type MasterlistCandidate = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

// Martin remains the designated source. Nora is used only when Martin is
// absent or inactive. A failed Google grant never skips to the other account:
// that account can hold a different Drive folder.
export function masterlistActorOrder(
  env: Record<string, string | undefined> = process.env,
) {
  return [env.MARTIN_EMAIL, env.NORA_EMAIL]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
}

export function selectMasterlistActor<T extends MasterlistCandidate>(
  order: string[],
  candidates: T[],
  allow: (user: T) => boolean,
) {
  for (const email of order) {
    const candidate = candidates.find(
      (user) => user.active && user.email === email && allow(user),
    );
    if (candidate) return candidate;
  }
  return null;
}

export function syncActorLabel(name: string) {
  const word = name.trim().split(/\s+/)[0] ?? "";
  if (!word || word.includes("@") || word.length > 40)
    return "der zuständigen Person";
  return word;
}

// The browser receives this object only. It has no token, Google address or
// folder id. The folder name stays with the person who owns the connection.
export function masterlistNoticeView(input: {
  viewerId: string;
  actor: { id: string; name: string } | null;
  access: MasterlistAccess;
  folderName?: string | null;
}) {
  if (!input.actor) return { role: "unset" as const };
  if (input.actor.id === input.viewerId)
    return {
      role: "self" as const,
      access: input.access,
      folderName: input.folderName?.trim() || null,
    };
  return {
    role: "other" as const,
    access: input.access,
    actorName: syncActorLabel(input.actor.name),
  };
}

const accesses = new Set<MasterlistAccess>([
  "ready",
  "consent_required",
  "unreachable",
  "missing",
]);

export type MasterlistNotice =
  | { role: "unset" }
  | { role: "self"; access: MasterlistAccess; folderName: string | null }
  | { role: "other"; access: MasterlistAccess; actorName: string };

function isAccess(value: unknown): value is MasterlistAccess {
  return typeof value === "string" && accesses.has(value as MasterlistAccess);
}

// A failed or unfamiliar status response is not a revoked grant and not a
// folder or account fact. The caller shows a neutral retry instead.
export function interpretMasterlistNotice(body: unknown): MasterlistNotice | "invalid" {
  if (!body || typeof body !== "object") return "invalid";
  const value = body as Record<string, unknown>;
  if (value.role === "unset" && Object.keys(value).every((key) => key === "role"))
    return { role: "unset" };
  if (value.role === "self" && isAccess(value.access)) {
    const folder = value.folderName;
    return {
      role: "self",
      access: value.access,
      folderName: typeof folder === "string" && folder.trim() && !folder.includes("@")
        ? folder.trim().slice(0, 120)
        : null,
    };
  }
  if (
    value.role === "other" &&
    isAccess(value.access) &&
    typeof value.actorName === "string" &&
    value.actorName.trim() &&
    !value.actorName.includes("@") &&
    value.actorName.trim().length <= 40
  )
    return {
      role: "other",
      access: value.access,
      actorName: value.actorName.trim(),
    };
  return "invalid";
}
