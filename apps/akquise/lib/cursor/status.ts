export const CURSOR_STATUSES = [
  "NOT_SENT",
  "HANDED_OFF",
  "IN_PROGRESS",
  "PREVIEW_READY",
  "ERROR",
] as const;
export type CursorStatus = (typeof CURSOR_STATUSES)[number];
export const CURSOR_STATUS_LABEL: Record<CursorStatus, string> = {
  NOT_SENT: "Noch nicht gesendet",
  HANDED_OFF: "An Cursor übergeben",
  IN_PROGRESS: "In Bearbeitung",
  PREVIEW_READY: "Vorschau bereit",
  ERROR: "Fehler",
};
export type CursorBlock = "protected" | "unapproved";
export type PublicCursorTask = {
  contentId: string;
  version: number;
  instruction: string;
  status: CursorStatus;
  label: string;
  pending: boolean;
  errorMessage: string;
  previewUrl: string;
  reviewUrl: string;
  route: "gpt" | "cursor";
  complete: false;
  note: string;
};
const AGENT_ID =
  /^bc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUN_ID =
  /^run-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED_PULLS = new Set(["313", "305"]);
export const isAgentId = (value: string) => AGENT_ID.test(value);
export const isRunId = (value: string) => RUN_ID.test(value);
export function isCursorStatus(value: string): value is CursorStatus {
  return (CURSOR_STATUSES as readonly string[]).includes(value);
}
/** Only the known Cursor agent page or this repository's pull requests can be opened. */
export function openableCursorHref(url: string) {
  const pull = url.match(
    /^https:\/\/github\.com\/mjeker99-collab\/studiojeker-website\/pull\/(\d+)$/,
  );
  if (pull && !DENIED_PULLS.has(pull[1])) return url;
  if (
    /^https:\/\/cursor\.com\/agents\/bc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      url,
    )
  )
    return url;
  return "";
}
/** A rendered HTML preview, never a GitHub pull request or a signed download URL. */
export function htmlPreviewHref(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.hostname === "github.com" ||
    !parsed.pathname.toLowerCase().endsWith(".html")
  )
    return "";
  return parsed.origin + parsed.pathname;
}
export function safeAgentUrl(agentId: string, url: unknown) {
  if (!isAgentId(agentId)) return "";
  const expected = `https://cursor.com/agents/${agentId}`;
  return url === expected ? expected : expected;
}
const FAILED_RUN = new Set(["ERROR", "CANCELLED", "EXPIRED"]);
const ACTIVE_RUN = new Set([
  "CREATING",
  "RUNNING",
  "WAITING_FOR_BACKGROUND_WORK",
]);
export function statusFromRun(
  runStatus: string,
  matchedPr: boolean,
  phase: "create" | "refresh",
): CursorStatus {
  if (FAILED_RUN.has(runStatus)) return "ERROR";
  if (runStatus === "FINISHED")
    return matchedPr ? "PREVIEW_READY" : "IN_PROGRESS";
  if (phase === "create" && runStatus === "CREATING") return "HANDED_OFF";
  if (ACTIVE_RUN.has(runStatus)) return "IN_PROGRESS";
  return "ERROR";
}
