"use client";
import { useEffect, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  name: string;
  website: string;
  contactName: string;
  contactEmail: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE";
  revision: number;
  _count: { campaigns: number; series: number };
};
type Form = Pick<
  Customer,
  "name" | "website" | "contactName" | "contactEmail" | "notes" | "status"
>;
const blank: Form = {
  name: "",
  website: "",
  contactName: "",
  contactEmail: "",
  notes: "",
  status: "ACTIVE",
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch("/api/customers/state", { cache: "no-store" });
    const value = await response.json();
    if (!response.ok)
      throw new Error(value.error || "Kunden konnten nicht geladen werden.");
    setCustomers(value);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers/state", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(
            value.error || "Kunden konnten nicht geladen werden.",
          );
        setCustomers(value);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/customers${editing ? "/" + editing.id : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing ? { revision: editing.revision, data: form } : form,
          ),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Speichern fehlgeschlagen.");
      await refresh();
      setEditing(null);
      setForm(null);
      setNotice("Kunde gespeichert.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel padded">
      <div className="section-head">
        <h2>Interne Kundenprofile</h2>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ ...blank });
          }}
        >
          Kunde erfassen ＋
        </button>
      </div>
      <p>
        Diese Profile dienen der internen Planung. Kunden erhalten keinen Login
        und keinen Zugriff auf StudioONE.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {form && (
        <form onSubmit={save} className="hub-editor">
          <h3>{editing ? "Kunde bearbeiten" : "Neuer Kunde"}</h3>
          <label>
            Firma / Kundenname
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Website (HTTPS)
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>
          <label>
            Ansprechperson
            <input
              maxLength={200}
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />
          </label>
          <label>
            Kontakt-E-Mail
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />
          </label>
          <label>
            Interne Notizen
            <textarea
              maxLength={5000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Form["status"] })
              }
            >
              <option value="ACTIVE">Aktiv</option>
              <option value="INACTIVE">Inaktiv</option>
            </select>
          </label>
          <button disabled={busy}>Speichern</button>{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setForm(null);
            }}
          >
            Schliessen
          </button>
        </form>
      )}
      <div className="hub-cards">
        {customers.map((c) => (
          <article className="panel padded" key={c.id}>
            <p className="eyebrow">
              {c.status === "ACTIVE" ? "AKTIV" : "INAKTIV"}
            </p>
            <h3>{c.name}</h3>
            {c.website && (
              <p>
                <a href={c.website} target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              </p>
            )}
            {c.contactName && <p>Ansprechperson: {c.contactName}</p>}
            {c.contactEmail && <p>E-Mail: {c.contactEmail}</p>}
            {c.notes && <p>{c.notes}</p>}
            <p>
              {c._count.campaigns} Kampagnen · {c._count.series} Content-Serien
            </p>
            <button
              className="secondary"
              onClick={() => {
                setEditing(c);
                setForm({
                  name: c.name,
                  website: c.website,
                  contactName: c.contactName,
                  contactEmail: c.contactEmail,
                  notes: c.notes,
                  status: c.status,
                });
              }}
            >
              Bearbeiten
            </button>
          </article>
        ))}
      </div>
      {!customers.length && <p>Noch keine Kundenprofile erfasst.</p>}
    </section>
  );
}
