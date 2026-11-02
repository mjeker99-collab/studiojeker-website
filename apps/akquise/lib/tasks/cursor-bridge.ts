import type { LayoutReport } from "./layout";

/**
 * Same routing rule as `taskRoute` in PR #322 `lib/cursor/contract.ts`.
 * Editorial wishes stay with GPT. Technical wishes are handed to Cursor.
 */
const TECHNICAL =
  /layout|vorlage|html|css|responsive|\bcode\b|cursor|technisch|abstand|spalte|template|struktur/i;

export function instructionRoute(instruction: string): "editorial" | "technical" {
  return TECHNICAL.test(instruction) ? "technical" : "editorial";
}

export const CURSOR_INTEGRATION_GAP =
  "Die Cursor-Verbindung aus PR #322 ist auf diesem Branch nicht eingebunden. handoffNewsletter liegt nur dort, und der Branch ist mit diesem PR in Konflikt. Es wurde kein Cursor-Auftrag gesendet.";

export type CursorHandoffView = {
  contentId: string;
  status: string;
  errorMessage?: string;
  previewUrl?: string;
  reviewUrl?: string;
  note?: string;
  complete?: boolean;
};

/** Maps the public task from PR #322. `complete` is ignored: that adapter always reports false. */
export function mapCursorHandoff(task: CursorHandoffView): LayoutReport {
  const externalJobId = `cursor:${task.contentId}`;
  const link = task.reviewUrl || task.previewUrl || undefined;
  if (task.status === "HANDED_OFF" || task.status === "IN_PROGRESS")
    return { state: "running", externalJobId };
  if (task.status === "PREVIEW_READY")
    return { state: "finished", externalJobId, url: link };
  return {
    blocked:
      task.errorMessage ||
      task.note ||
      "Cursor hat den Auftrag nicht angenommen. Es wurde nichts als erledigt markiert.",
    externalJobId,
  };
}

export async function unavailableCursorLayout(): Promise<LayoutReport> {
  return { blocked: CURSOR_INTEGRATION_GAP };
}
