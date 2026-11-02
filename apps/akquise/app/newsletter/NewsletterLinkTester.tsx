"use client";

import { useMemo, useState } from "react";
import { getNewsletterTemplate, type NewsletterSnapshot } from "@/lib/hub/newsletter-template";

type Check = { url: string; status: "reachable" | "broken" | "review"; detail: string };
type Link = { url: string; labels: string[]; valid: boolean };

function validPublicLink(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch { return false; }
}

export default function NewsletterLinkTester({ newsletter }: { newsletter: NewsletterSnapshot }) {
  const links = useMemo(() => {
    const items = new Map<string, Link>();
    const slots = getNewsletterTemplate(newsletter.templateId).slots
      .filter((slot) => !slot.special && slot.kind === "link");
    for (const slot of slots) {
      const url = newsletter.fields[slot.key]?.trim() || "";
      const label = slot.region + " · " + (slot.key.includes("video") ? "Video" :
        slot.key.includes("cta") ? "Button" : slot.key.includes("image") ? "Bildlink" : "Link");
      const existing = items.get(url);
      if (existing) existing.labels.push(label);
      else items.set(url, { url, labels: [label], valid: validPublicLink(url) });
    }
    return [...items.values()];
  }, [newsletter]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});


  async function run() {
    setExpanded(true);
    setLoading(true);
    setError("");
    setChecks({});
    try {
      const response = await fetch("/api/newsletter/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: links.map((link) => link.url) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Linkprüfung fehlgeschlagen.");
      setChecks(Object.fromEntries((data.results as Check[]).map((item) => [item.url, item])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Linkprüfung fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  const manuallyChecked = links.filter((link) => reviewed[link.url]).length;
  const missing = links.filter((link) => checks[link.url]?.status === "broken").length;
  return (
    <section aria-label="Newsletter-Links testen" style={{ marginBottom: 14 }}>
      <div className="actions">
        <button className="secondary" type="button" disabled={loading || !links.length}
          onClick={() => void run()}>
          {loading ? "Links werden geprüft …" : `Links testen (${links.length})`}
        </button>
        {expanded && <button className="secondary" type="button"
          onClick={() => setExpanded(false)}>Prüfung schliessen</button>}
      </div>
      {expanded && (
        <div style={{ padding: 12, marginTop: 8, border: "1px solid var(--border, #d9e0e5)", borderRadius: 10 }}>
          <strong>Alle Ziele vor Mailchimp prüfen</strong>
          <p className="muted">Öffne jeden Link separat, prüfe das richtige Ziel und markiere ihn erst danach.
            Die automatische Serverprüfung allein bestätigt nicht, ob der Inhalt stimmt.</p>
          {error && <p role="alert">{error}</p>}
          <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
            {links.map((link) => {
              const check = checks[link.url];
              const status = !link.valid ? "Ungültige HTTPS-Adresse" :
                check?.status === "reachable" ? "Server erreichbar" :
                  check?.status === "broken" ? "Link nicht gefunden" :
                    check ? check.detail : "Noch nicht automatisch geprüft";
              return <li key={link.url} style={{ overflowWrap: "anywhere", borderTop: "1px solid var(--border, #d9e0e5)", paddingTop: 9 }}>
                <strong>{[...new Set(link.labels)].join(" / ")}</strong>
                <p style={{ margin: "4px 0" }}>{link.url || "Kein Ziel hinterlegt"}</p>
                <p style={{ margin: "4px 0" }} role="status">{status}</p>
                {link.valid && <a href={link.url} target="_blank" rel="noopener noreferrer">
                  Ziel in neuem Tab öffnen ↗
                </a>}
                <label className="check" style={{ marginTop: 6 }}>
                  <input type="checkbox" disabled={!link.valid}
                    checked={!!reviewed[link.url]}
                    onChange={(event) => setReviewed((current) => ({ ...current, [link.url]: event.target.checked }))} />
                  Ziel und Inhalt selbst geprüft
                </label>
              </li>;
            })}
          </ul>
          <p role="status">{missing ? `${missing} Link(s) nicht gefunden. ` : ""}
            {manuallyChecked} von {links.length} Zielen manuell geprüft.
          </p>
        </div>
      )}
    </section>
  );
}
