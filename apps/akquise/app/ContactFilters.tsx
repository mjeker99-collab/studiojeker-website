"use client";
import {
  contactFilterOptions,
  emptyContactFilters,
  type FilterContact,
  type ContactFilters as Filters,
} from "../lib/contact-filters";
export default function ContactFilters({
  contacts,
  value,
  onChange,
  disabled = false,
}: {
  contacts: FilterContact[];
  value: Filters;
  onChange: (value: Filters) => void;
  disabled?: boolean;
}) {
  const options = contactFilterOptions(contacts);
  return (
    <div className="form-grid" aria-label="Masterliste filtern">
      <label>
        Kunde / Unternehmen
        <select
          disabled={disabled}
          value={value.company}
          onChange={(e) => onChange({ ...value, company: e.target.value })}
        >
          <option value="">Alle Kunden / Unternehmen</option>
          {options.companies.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Branche
        <select
          disabled={disabled}
          value={value.industry}
          onChange={(e) => onChange({ ...value, industry: e.target.value })}
        >
          <option value="">Alle Branchen</option>
          <option value="__empty__">Ohne Branchenangabe</option>
          {options.industries.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {(value.company || value.industry) && (
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(emptyContactFilters)}
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
