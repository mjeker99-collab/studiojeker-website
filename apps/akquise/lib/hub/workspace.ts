export const contentWorkspaces = [
  "SOCIAL_POST",
  "CONTENT_DRAFT",
  "GPT_DIALOG",
] as const;

export type ContentWorkspace = (typeof contentWorkspaces)[number];

export const workspaceLabels: Record<ContentWorkspace, string> = {
  SOCIAL_POST: "Social Post",
  CONTENT_DRAFT: "Content-Entwurf",
  GPT_DIALOG: "GPT-Dialog",
};

/** Social Media publishing list: only real posts, never GPT dialogs or studio drafts. */
export function isSocialPublishingPost(content: {
  kind: string;
  workspace?: string | null;
}): boolean {
  return (
    content.kind === "SOCIAL" &&
    (content.workspace || "SOCIAL_POST") === "SOCIAL_POST"
  );
}

/** Content that can be promoted into the Social Media publishing workspace. */
export function canPromoteToSocial(content: {
  kind: string;
  workspace?: string | null;
}): boolean {
  const workspace = content.workspace || "SOCIAL_POST";
  return (
    content.kind === "SOCIAL" &&
    (workspace === "CONTENT_DRAFT" || workspace === "GPT_DIALOG")
  );
}

/**
 * Classify a studio briefing for new series creation.
 * Conversation stubs from GPT entry points use the shared placeholders.
 */
export function workspaceForBriefing(brief: {
  goal: string;
  audience: string;
  workspace?: ContentWorkspace;
}): ContentWorkspace {
  if (brief.workspace) return brief.workspace;
  if (
    brief.goal === "Im Gespräch klären" &&
    brief.audience === "Im Gespräch klären"
  )
    return "GPT_DIALOG";
  return "CONTENT_DRAFT";
}
