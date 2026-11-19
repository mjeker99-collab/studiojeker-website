// Shared by selection and dispatch. Verified marketing/communications addresses
// are allowed; general inboxes remain excluded from acquisition.
export function acquisitionAddressIssue(email: string) {
  const value = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Gültige E-Mail-Adresse fehlt.";
  if (
    /^(info|kontakt|contact|office|admin|hello|mail|sales|support|sekretariat|zentrale|service|team|post|buchhaltung|noreply|no-reply)([.+_-].*)?@/i.test(
      value,
    )
  )
    return "Allgemeine E-Mail-Adressen sind nicht freigabefähig.";
  return "";
}
