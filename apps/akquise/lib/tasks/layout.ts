export type LayoutReport = {
  blocked?: string;
  state?: "running" | "finished" | "failed";
  externalJobId?: string;
  version?: number;
  url?: string;
};

export type LayoutOutcome =
  | {
      kind: "blocked";
      error: string;
      externalJobId: string | null;
      reviewUrl?: string;
    }
  | { kind: "waiting"; externalJobId: string; detail: string };

const SAFE_LINK = /^https:\/\/[^\s@]+$/;

/**
 * Cursor progress is not a finished newsletter. PREVIEW_READY keeps the link
 * and stays blocked until a StudioONE version exists. There is no SUCCEEDED.
 */
export function layoutDecision(report: LayoutReport): LayoutOutcome {
  const externalJobId = report.externalJobId || null;
  const reviewUrl =
    report.url && SAFE_LINK.test(report.url) ? report.url : undefined;
  if (report.blocked)
    return { kind: "blocked", error: report.blocked, externalJobId };
  if (report.state === "running" && externalJobId)
    return {
      kind: "waiting",
      externalJobId,
      detail: "An Cursor übergeben. Der Auftrag ist nicht abgeschlossen.",
    };
  if (report.state === "finished" && reviewUrl)
    return {
      kind: "blocked",
      error:
        "Cursor hat einen Link gemeldet. Die Newsletter-Version in StudioONE ist dadurch nicht geändert und nicht veröffentlicht.",
      externalJobId,
      reviewUrl,
    };
  if (report.state === "finished")
    return {
      kind: "blocked",
      error:
        "Cursor meldet Abschluss ohne prüfbaren Link. Der Auftrag ist nicht erledigt.",
      externalJobId,
    };
  return {
    kind: "blocked",
    error:
      "Die Cursor-Verbindung hat keinen übernehmbaren Stand gemeldet. Es wurde nichts veröffentlicht.",
    externalJobId,
  };
}
