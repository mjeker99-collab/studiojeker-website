export function statusHeadline(status: string, error: string | null) {
  switch (status) {
    case "QUEUED":
      return "Der Auftrag ist gespeichert und wird bearbeitet.";
    case "RUNNING":
      return "Der Newslettertext wird überarbeitet.";
    case "SUCCEEDED":
      return "Fertig. Die neue Version ist gespeichert. Die Vorschau zeigt den Text.";
    case "WAITING_APPROVAL":
      return "Diese Aktion braucht deine Freigabe, bevor etwas passiert.";
    case "BLOCKED":
    case "FAILED":
      return error || "Der Auftrag ist angehalten. Es wurde nichts veröffentlicht.";
    default:
      return "Der Auftrag ist gespeichert.";
  }
}

export function nextStepText(status: string) {
  switch (status) {
    case "QUEUED":
    case "RUNNING":
      return "Du kannst die Seite schliessen. Der Stand bleibt erhalten.";
    case "SUCCEEDED":
      return "Prüfe die Vorschau. Versand und Veröffentlichung bleiben aus.";
    case "WAITING_APPROVAL":
      return "Lies die Version und gib sie frei, wenn sie stimmt.";
    case "BLOCKED":
      return "Es wurde nichts überschrieben. Passe den Newsletter an oder starte später neu.";
    case "FAILED":
      return "Es wurde nichts gespeichert. Du kannst den Auftrag erneut starten.";
    default:
      return "";
  }
}
