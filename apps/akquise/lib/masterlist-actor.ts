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
