export type MailchimpErrorClass =
  | "none"
  | "not_configured"
  | "invalid_configuration"
  | "auth"
  | "timeout"
  | "unreachable"
  | "rate_limited"
  | "http"
  | "invalid_response"
  | "incomplete";

export type MailchimpDiagnosis = {
  configured: boolean;
  reachable: boolean;
  audienceCount: number | null;
  errorClass: MailchimpErrorClass;
};

export type MailchimpContactCounts = {
  read: number;
  subscribed: number;
  unsubscribed: number;
  cleaned: number;
  pending: number;
  excluded: number;
  duplicates: number;
  existing: number;
  newContacts: number;
  errors: number;
};

export type MailchimpContactReport = MailchimpDiagnosis & {
  imported: 0;
  persisted: false;
  sent: false;
  counts: MailchimpContactCounts;
};

const failure: Partial<Record<MailchimpErrorClass, string>> = {
  not_configured: "Mailchimp ist noch nicht verbunden.",
  invalid_configuration:
    "Die Mailchimp-Verbindung ist unvollständig. Bitte den Administrator informieren.",
  auth: "Mailchimp hat den Zugang abgelehnt.",
  timeout: "Mailchimp hat nicht rechtzeitig geantwortet. Bitte später erneut versuchen.",
  unreachable: "Mailchimp ist gerade nicht erreichbar.",
  rate_limited: "Mailchimp begrenzt gerade die Abfragen. Bitte später erneut versuchen.",
  http: "Die Prüfung konnte nicht abgeschlossen werden.",
  invalid_response: "Die Prüfung konnte nicht abgeschlossen werden.",
};

export function mailchimpCheckSummary(report: MailchimpContactReport) {
  if (report.errorClass !== "none" && report.errorClass !== "incomplete")
    return failure[report.errorClass] ?? "Die Prüfung konnte nicht abgeschlossen werden.";
  const counts = report.counts;
  const detail = `Geprüft: ${report.audienceCount ?? 0} Audiences, ${counts.subscribed} abonniert, ${counts.existing} bereits in StudioONE, ${counts.newContacts} noch nicht übernommen, ${counts.unsubscribed} abgemeldet, ${counts.cleaned} bereinigt, ${counts.pending} ausstehend, ${counts.duplicates} Dubletten, ${counts.excluded} ausgeschlossen.`;
  if (report.errorClass === "incomplete")
    return `Die Prüfung umfasst nur einen Teil der Mailchimp-Kontakte. ${detail} Es wurde nichts gespeichert und nichts versendet.`;
  return `${detail} Es wurde nichts gespeichert und nichts versendet.`;
}

export function publicDiagnosis(report: MailchimpDiagnosis): MailchimpDiagnosis {
  return {
    configured: report.configured,
    reachable: report.reachable,
    audienceCount: report.audienceCount,
    errorClass: report.errorClass,
  };
}

export function publicContactReport(report: MailchimpContactReport): MailchimpContactReport {
  return {
    ...publicDiagnosis(report),
    imported: 0,
    persisted: false,
    sent: false,
    counts: {
      read: report.counts.read,
      subscribed: report.counts.subscribed,
      unsubscribed: report.counts.unsubscribed,
      cleaned: report.counts.cleaned,
      pending: report.counts.pending,
      excluded: report.counts.excluded,
      duplicates: report.counts.duplicates,
      existing: report.counts.existing,
      newContacts: report.counts.newContacts,
      errors: report.counts.errors,
    },
  };
}
