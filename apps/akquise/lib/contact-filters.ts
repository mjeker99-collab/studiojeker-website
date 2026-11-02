export type FilterContact = { organisation: string; industry?: string };
export type ContactFilters = { company: string; industry: string };
export const emptyContactFilters: ContactFilters = {
  company: "",
  industry: "",
};
export function matchesContactFilters(c: FilterContact, f: ContactFilters) {
  return (
    (!f.company || c.organisation.trim() === f.company) &&
    (!f.industry ||
      (f.industry === "__empty__"
        ? !c.industry?.trim()
        : c.industry?.trim() === f.industry))
  );
}
export function contactFilterOptions(contacts: FilterContact[]) {
  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "de-CH"),
    );
  return {
    companies: unique(contacts.map((c) => c.organisation.trim())),
    industries: unique(contacts.map((c) => c.industry?.trim() || "")),
  };
}
