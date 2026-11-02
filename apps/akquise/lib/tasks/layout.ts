export type LayoutReport = {
  blocked?: string;
  state?: "running" | "finished" | "failed";
  externalJobId?: string;
  version?: number;
  url?: string;
};

/**
 * A Cursor "finished" signal is not success. P1 never promotes a layout task
 * to SUCCEEDED; a later adapter must still prove a stored version and link.
 */
export function layoutDecision(report: LayoutReport): {
  status: "BLOCKED";
  error: string;
  externalJobId: string | null;
} {
  const externalJobId = report.externalJobId || null;
  if (report.blocked)
    return { status: "BLOCKED", error: report.blocked, externalJobId };
  if (report.state === "finished" && report.version && report.url)
    return {
      status: "BLOCKED",
      error:
        "Cursor meldet eine Version und einen Link. Die Ausgabe wird erst übernommen, wenn sie in StudioONE geprüft ist. Nichts wurde veröffentlicht.",
      externalJobId,
    };
  if (report.state === "finished")
    return {
      status: "BLOCKED",
      error:
        "Cursor meldet Abschluss ohne prüfbare Version oder ohne Link. Der Auftrag ist nicht erledigt.",
      externalJobId,
    };
  return {
    status: "BLOCKED",
    error:
      "Der Cursor-Adapter ist in diesem Pilot nicht angebunden. Es wurde kein Layoutauftrag gesendet.",
    externalJobId,
  };
}

export const CURSOR_ADAPTER_BLOCK =
  "Layoutänderungen warten auf den Cursor-Adapter aus PR #322. Es wurde nichts an Cursor gesendet.";
